import { createContext, type ReactNode, useContext } from "react";
import { getCollections } from "./collections";

type CollectionsContextType = ReturnType<typeof getCollections> & {
	switchOrganization: (organizationId: string) => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextType | null>(null);

const LOCAL_ORG_ID = "local";

export function preloadActiveOrganizationCollections(
	_activeOrganizationId: string | null | undefined,
): void {}

export function CollectionsProvider({ children }: { children: ReactNode }) {
	const collections = getCollections(LOCAL_ORG_ID);

	return (
		<CollectionsContext.Provider
			value={{ ...collections, switchOrganization: async () => {} }}
		>
			{children}
		</CollectionsContext.Provider>
	);
}

export function useCollections(): CollectionsContextType {
	const context = useContext(CollectionsContext);
	if (!context) {
		throw new Error("useCollections must be used within CollectionsProvider");
	}
	return context;
}
