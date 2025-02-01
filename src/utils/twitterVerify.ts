import env from "@/config/env"
import { get } from "axios"

export const twitterVerify = async (rest_id: string) => {
    try {
        console.log(`${env.VERIFY_URL}/${rest_id}`)
        const res = await get(`${env.VERIFY_URL}/${rest_id}`)
        console.log(res.data)
        return res.data
    } catch (error) {
        console.error(error)
        return null
    }
}