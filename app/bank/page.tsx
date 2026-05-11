import { DEMO_USER_ID, getUser, listBankTransactions } from "@/lib/db";

import BankClient from "./BankClient";

export const dynamic = "force-dynamic";

export default function BankPage() {
  const user = getUser(DEMO_USER_ID)!;
  return (
    <BankClient
      connected={user.bank_connected === 1}
      transactions={listBankTransactions(DEMO_USER_ID)}
    />
  );
}
