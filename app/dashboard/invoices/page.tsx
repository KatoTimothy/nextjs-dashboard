import React from 'react'

export default async function Invoice() {

    const data = await new Promise<String>(resolve => setTimeout(() => {
        resolve('Invoice page data resolved...')
    }, 6000))
    return <div>{data}</div>
}


