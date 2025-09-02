import { useCallback, useState } from "react";

export const useSet = <T>(initial?: T[]) => {
  const [set, setSet] = useState<Set<T>>(new Set(initial));

  const add = useCallback((item: T) => {
    setSet((prev) => new Set(prev).add(item));
  }, []);

  const remove = useCallback((item: T) => {
    setSet((prev) => {
      const updated = new Set(prev);
      updated.delete(item);
      return updated;
    });
  }, []);

  return { set, add, remove };
};
