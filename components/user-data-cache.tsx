"use client";

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UserData {
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface UserDataCacheContextType {
  cache: Record<string, UserData>;
  getUserData: (userId: string) => UserData | undefined;
  fetchUserData: (userIds: string[]) => Promise<void>;
  isLoading: boolean;
}

const UserDataCacheContext = React.createContext<UserDataCacheContextType | undefined>(undefined);

interface UserDataCacheProviderProps {
  children: React.ReactNode;
}

export function UserDataCacheProvider({ children }: UserDataCacheProviderProps) {
  const [cache, setCache] = React.useState<Record<string, UserData>>({});
  const [pendingUserIds, setPendingUserIds] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(false);
  const getUserDataAction = useAction(api.messages.getUserData);

  // Debounce batch fetching
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingQueueRef = React.useRef<Set<string>>(new Set());

  const fetchUserData = React.useCallback(async (userIds: string[]) => {
    // Filter out already cached or pending user IDs
    const newUserIds = userIds.filter(
      (id) => !cache[id] && !pendingUserIds.has(id) && !pendingQueueRef.current.has(id)
    );

    if (newUserIds.length === 0) return;

    // Add to pending queue
    newUserIds.forEach((id) => pendingQueueRef.current.add(id));

    // Clear existing timeout and set new one to batch requests
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(async () => {
      const idsToFetch = Array.from(pendingQueueRef.current);
      pendingQueueRef.current.clear();

      if (idsToFetch.length === 0) return;

      // Mark as pending
      setPendingUserIds((prev) => {
        const next = new Set(prev);
        idsToFetch.forEach((id) => next.add(id));
        return next;
      });

      setIsLoading(true);

      try {
        const usersData = await getUserDataAction({ userIds: idsToFetch });
        
        const newCache: Record<string, UserData> = {};
        usersData.forEach((user) => {
          newCache[user.userId] = {
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          };
        });

        setCache((prev) => ({ ...prev, ...newCache }));
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
        setPendingUserIds((prev) => {
          const next = new Set(prev);
          idsToFetch.forEach((id) => next.delete(id));
          return next;
        });
      }
    }, 50); // 50ms debounce for batching
  }, [cache, pendingUserIds, getUserDataAction]);

  const getUserData = React.useCallback(
    (userId: string): UserData | undefined => {
      return cache[userId];
    },
    [cache]
  );

  const value = React.useMemo(
    () => ({
      cache,
      getUserData,
      fetchUserData,
      isLoading,
    }),
    [cache, getUserData, fetchUserData, isLoading]
  );

  return (
    <UserDataCacheContext.Provider value={value}>
      {children}
    </UserDataCacheContext.Provider>
  );
}

export function useUserDataCache() {
  const context = React.useContext(UserDataCacheContext);
  if (context === undefined) {
    throw new Error("useUserDataCache must be used within a UserDataCacheProvider");
  }
  return context;
}

// Hook to automatically fetch and get user data
export function useUserData(userIds: string[]) {
  const { cache, fetchUserData } = useUserDataCache();

  React.useEffect(() => {
    if (userIds.length > 0) {
      fetchUserData(userIds);
    }
  }, [userIds, fetchUserData]);

  return React.useMemo(() => {
    const result: Record<string, UserData> = {};
    userIds.forEach((id) => {
      if (cache[id]) {
        result[id] = cache[id];
      }
    });
    return result;
  }, [cache, userIds]);
}
