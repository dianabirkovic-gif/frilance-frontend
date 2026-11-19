import { useQuery } from "@tanstack/react-query";
import { getMySalary, mySalaryQueryKey } from "../../api/finance";

/**
 * One month of the signed-in member's own pay. Like `useFinance` it must not
 * gain `placeholderData: keepPreviousData`: the month heading flips on the
 * click, so retained payouts would sit under the next month's title.
 */
export function useMySalary(month: string) {
  return useQuery({
    queryKey: mySalaryQueryKey(month),
    queryFn: () => getMySalary(month),
  });
}
