import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface CollectionDrawerContextType {
  openCollectionId: string | null;
  openCollection: (collectionId: string) => void;
  closeCollection: () => void;
}

const CollectionDrawerContext = createContext<CollectionDrawerContextType | undefined>(undefined);

// The notification bell lives in the global TopNav and needs to open a collection's
// detail drawer regardless of which page is currently active — this is the one piece
// of app-wide state this feature needs; everywhere else in the app uses page-local
// state or prop drilling for panels.
export const CollectionDrawerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);

  const openCollection = useCallback((collectionId: string) => {
    setOpenCollectionId(collectionId);
  }, []);

  const closeCollection = useCallback(() => {
    setOpenCollectionId(null);
  }, []);

  const value = useMemo(
    () => ({ openCollectionId, openCollection, closeCollection }),
    [openCollectionId, openCollection, closeCollection]
  );

  return <CollectionDrawerContext.Provider value={value}>{children}</CollectionDrawerContext.Provider>;
};

export const useCollectionDrawer = (): CollectionDrawerContextType => {
  const context = useContext(CollectionDrawerContext);
  if (!context) throw new Error('useCollectionDrawer must be used within CollectionDrawerProvider');
  return context;
};
