import { getUser, listBankTransactions } from "@/lib/db";
import { getUserId } from "@/lib/session";

import BankClient from "./BankClient";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const userId = await getUserId();
  const user = getUser(userId)!;
  return (
    <BankClient
      connected={user.bank_connected === 1}
      transactions={listBankTransactions(userId)}
    />
  );
}
