"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UserData {
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
}

interface UserDataCacheContextType {
  cache: Record<string, UserData>;
  getUserData: (userId: string) => UserData | undefined;
  fetchUserData: (userIds: string[]) => void;
  isLoading: boolean;
}

const UserDataCacheContext = React.createContext<UserDataCacheContextType | undefined>(undefined);

interface UserDataCacheProviderProps {
  children: React.ReactNode;
}

export function UserDataCacheProvider({ children }: UserDataCacheProviderProps) {
  const [requestedUserIds, setRequestedUserIds] = React.useState<string[]>([]);
  
  // Use Convex query instead of action - this is reactive and much faster
  const usersData = useQuery(
    api.users.getUserData,
    requestedUserIds.length > 0 ? { userIds: requestedUserIds } : "skip"
  );

  // Build cache from query results
  const cache = React.useMemo(() => {
    if (!usersData) return {};
    
    const newCache: Record<string, UserData> = {};
    usersData.forEach((user) => {
      newCache[user.userId] = {
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      };
    });
    return newCache;
  }, [usersData]);

  const isLoading = requestedUserIds.length > 0 && !usersData;

  // Debounce adding new user IDs to prevent too many re-renders
  const pendingQueueRef = React.useRef<Set<string>>(new Set());
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchUserData = React.useCallback((userIds: string[]) => {
    // Filter out already requested user IDs
    const newUserIds = userIds.filter(
      (id) => !requestedUserIds.includes(id) && !pendingQueueRef.current.has(id)
    );

    if (newUserIds.length === 0) return;

    // Add to pending queue
    newUserIds.forEach((id) => pendingQueueRef.current.add(id));

    // Clear existing timeout and set new one to batch requests
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      const idsToAdd = Array.from(pendingQueueRef.current);
      pendingQueueRef.current.clear();

      if (idsToAdd.length === 0) return;

      setRequestedUserIds((prev) => {
        const newIds = idsToAdd.filter((id) => !prev.includes(id));
        if (newIds.length === 0) return prev;
        return [...prev, ...newIds];
      });
    }, 50); // 50ms debounce for batching
  }, [requestedUserIds]);

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
