import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { enhancedApi } from "../app/enhancedApi";
import { useIdentity } from "../hooks/usePermission";
import { DocumentFilmstrip } from "./DocumentFilmstrip";

// Collections shown when none is marked as favorite
const FALLBACK_COLLECTIONS = 5;

export const RecentWidget = () => {
  const { t } = useTranslation();
  return <DocumentFilmstrip title={t("home.widgets.recent")} query="" />;
};

export const SharedWithMeWidget = () => {
  const { t } = useTranslation();
  const { data: identity } = useIdentity();
  // Nothing can be shared with anonymous users or without an IdP
  if (!identity?.isAuthenticated || identity.userId === "system") return null;
  return (
    <DocumentFilmstrip
      title={t("home.widgets.shared")}
      query="shared:me"
      hideWhenEmpty
    />
  );
};

export const CollectionsWidget = () => {
  const { data } = enhancedApi.useListCollectionsQuery({ limit: 20 });
  const collections = useMemo(() => {
    const items = data?.items ?? [];
    const favorites = items.filter((c) => c.isFavorite);
    return favorites.length > 0
      ? favorites
      : items.slice(0, FALLBACK_COLLECTIONS);
  }, [data]);

  return (
    <>
      {collections.map((collection) => (
        <DocumentFilmstrip
          key={collection.id}
          title={collection.name}
          query={collection.filterExpression}
          gallerySearch={{ collection: collection.id }}
          hideWhenEmpty
        />
      ))}
    </>
  );
};

export const RediscoverWidget = () => {
  const { t } = useTranslation();
  // A new selection every day, stable across reloads within the day
  const seed = new Date().toISOString().slice(0, 10);
  return (
    <DocumentFilmstrip
      title={t("home.widgets.rediscover")}
      query="sort:random"
      seed={seed}
      gallerySearch={{ sort: "random", seed }}
      hideWhenEmpty
    />
  );
};
