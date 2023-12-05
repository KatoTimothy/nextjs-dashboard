"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

//shape of data returned by createInvoice action
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

//creates new invoice data given form data
export async function createInvoice(previousState: State, formData: FormData) {
  //extract form data into usable object
  const rawFormData = Object.fromEntries(formData.entries());

  //zod schema to validate form data
  const formDataSchema = z.object({
    id: z.string(),
    customerId: z.string({ required_error: "Please selected customer" }),
    amount: z.coerce.number().gt(0, "Please enter an amount greater than $0"),
    status: z.enum(["paid", "pending"], {
      required_error: "Please select an invoice status.",
    }),
    date: z.string(),
  });

  const CreateInvoice = formDataSchema.omit({ id: true, date: true });

  //parse form data without throwing error
  const validatedFields = CreateInvoice.safeParse(rawFormData);

  //if validated fields fail return errors early, otherwise continue
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing fields. Failed to create Invoice!",
    };
  }

  //prepare data for insertion
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  //insert data into database
  try {
    await sql`
            INSERT INTO invoices(customer_id, amount, status, date)
                VALUES(${customerId}, ${amountInCents}, ${status}, ${date})
        `;
  } catch (error) {
    return {
      message: "Database Error: Failed to Create Invoice.",
    };
  }

  //revalidate cache for invoice page, and redirect the user
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

//update invoice data given its id
export async function updateInvoice(id: string, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(["pending", "paid"]),
    date: z.string(),
  });

  const UpdateInvoice = FormSchema.omit({ id: true, date: true });

  const { amount, status, customerId } = UpdateInvoice.parse(rawFormData);

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  //update db with form data
  try {
    await sql`
            UPDATE invoices
                SET customer_id = ${customerId}, status=${status}, amount=${amountInCents}, date=${date}
                WHERE id=${id}
        `;
  } catch (error) {
    return {
      message: "Database Error: Failed to update Invoice.",
    };
  }
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

//deletes invoice that matches given id
export async function deleteInvoice(id: string) {
  //delete the invoice that matches passed id
  try {
    await sql`
            DELETE FROM invoices
                WHERE id=${id}
        `;
  } catch (error) {
    return {
      message: "Database Error: Failed to delete Invoice.",
    };
  }

  //revalidate cache for invoice page and redirect user
  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}
