import { Metadata } from "next"
import FinanceClient from "./FinanceClient";

export const metadata: Metadata = {
  title: "Next JS ",
  description: "Primeira aplição com Next Js"
}

export default function Home() {
  return (
    <FinanceClient />
  )
}
