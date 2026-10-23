import { api, type Document } from "../app/api";
import { DocumentPreview } from "./DocumentPreview";
import { useCallback, useEffect, useState } from "react";
import { DocumentPreviewControls } from "../components/DocumentPreviewControls";
import { useDocumentUrl } from "../hooks/useDocumentUrl";
import { DocumentDiashow } from "../components/DocumentDiashow";
import { preventInputHandling } from "../util/preventInputHandling";
import { DocumentInfoPanel } from "./DocumentInfoPanel";
import { PreviewFilmstrip } from "./PreviewFilmstrip";
import type { Filmstrip } from "../hooks/usePreviewNavigation";
import { useAppDispatch, useAppSelector } from "../app/store";
import { selectShowFilmstrip, setShowFilmstrip } from "../app/persistent.slice";
import { useIsMobileScreen } from "../hooks/useIsMobileScreen";

type Props = {
  previewImageId: string;
  previewImageIndex: number;
  previewDocument: Document | undefined;
  // Neighbourhood of the previewed document shown below the preview
  filmstrip: Filmstrip;
  totalDocuments: number;
  onThumbnailClicked: (document: Document) => void;
  nextPreviewImage: () => void;
  previousPreviewImage: () => void;
  onClose?: () => void;
};

export const PreviewContainer = ({
  previewImageId,
  previewImageIndex,
  previewDocument: currentDocument,
  filmstrip,
  totalDocuments,
  onThumbnailClicked,
  nextPreviewImage,
  previousPreviewImage,
  onClose,
}: Props) => {
  const [diashowMode, setDiashowMode] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [wasFullscreen, setWasFullscreen] = useState(false);

  const dispatch = useAppDispatch();
  const isMobile = useIsMobileScreen();
  // Hidden on small screens unless asked for, swiping is the main navigation
  const showFilmstrip = useAppSelector(selectShowFilmstrip) ?? !isMobile;
  const toggleFilmstrip = useCallback(
    () => dispatch(setShowFilmstrip(!showFilmstrip)),
    [dispatch, showFilmstrip],
  );

  const { data: identity } = api.useGetMeQuery();
  const { data: config } = api.useGetAppConfigQuery();
  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
  const canManageAccess =
    !!config?.idpEnabled &&
    !!identity &&
    (identity.permissions.includes("admin:users") ||
      (identity.userId !== null &&
        identity.userId !== SYSTEM_USER_ID &&
        identity.userId === currentDocument?.ownerId));

  const mimeType = currentDocument?.mime;
  const documentDownloadUrl = useDocumentUrl(previewImageId);

  const onCloseImpl = useCallback(() => {
    if (diashowMode) setDiashowMode(false);
    else onClose?.();
  }, [onClose, diashowMode]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (preventInputHandling()) return;
      if (event.key === "ArrowRight") nextPreviewImage();
      else if (event.key === "ArrowLeft") previousPreviewImage();
      else if (event.key === "Escape") onCloseImpl();
      else if (event.key === "p") setDiashowMode((m) => !m);
      else if (event.key === "i") setShowInfoPanel((m) => !m);
      else if (event.key === "t") toggleFilmstrip();
    };
    window.addEventListener("keydown", keyDownHandler);
    return () => window.removeEventListener("keydown", keyDownHandler);
  }, [nextPreviewImage, previousPreviewImage, onCloseImpl, toggleFilmstrip]);

  useEffect(() => {
    if (diashowMode) {
      setWasFullscreen(!!document.fullscreenElement);
      document.body.requestFullscreen();
    } else if (!wasFullscreen && document.fullscreenElement) {
      document.exitFullscreen();
    }
  }, [diashowMode, wasFullscreen]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && diashowMode) {
        setDiashowMode(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [diashowMode]);

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Header — hidden during presentation */}
      {!diashowMode && (
        <div className="flex-shrink-0 h-14 bg-surface-1 border-b border-border">
          <DocumentPreviewControls
            documentId={previewImageId}
            friendlyName={currentDocument?.friendlyName}
            previewImageIndex={previewImageIndex}
            totalDocuments={totalDocuments}
            mimeType={mimeType}
            downloadDocument={() => {
              const link = document.createElement("a");
              link.href = documentDownloadUrl;
              link.download = "";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            toggleDiashow={() => setDiashowMode((m) => !m)}
            toggleInfoPanel={() => setShowInfoPanel((m) => !m)}
            showInfoPanel={showInfoPanel}
            toggleFilmstrip={toggleFilmstrip}
            showFilmstrip={showFilmstrip}
            onClose={onCloseImpl}
          />
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Preview */}
        <div className="flex-1 relative overflow-hidden bg-bg-base">
          {diashowMode ? (
            <DocumentDiashow
              documentId={previewImageId}
              nextDocument={nextPreviewImage}
              previousDocument={previousPreviewImage}
              mimeType={mimeType}
              toggleInfoPanel={() => setShowInfoPanel((m) => !m)}
              showInfoPanel={showInfoPanel}
              endPresentation={() => setDiashowMode(false)}
            />
          ) : (
            <DocumentPreview
              id={previewImageId}
              mimeType={mimeType}
              nextPreviewImage={nextPreviewImage}
              previousPreviewImage={previousPreviewImage}
              hasNext={!!currentDocument?.nextId}
              hasPrevious={!!currentDocument?.previousId}
            />
          )}
        </div>

        {/* Mobile backdrop — tapping the image area closes the info panel */}
        {showInfoPanel && (
          <div
            className="md:hidden absolute inset-0 z-[9]"
            onClick={() => setShowInfoPanel(false)}
          />
        )}

        {/* Info panel — on mobile: absolute overlay; on desktop: flex sibling with width animation */}
        <div
          className={
            "overflow-hidden transition-[width] duration-300 ease-in-out " +
            "absolute top-0 right-0 h-full z-10 " +
            "md:relative md:flex-shrink-0 md:z-auto " +
            (showInfoPanel ? "w-80 xl:w-96" : "w-0")
          }
        >
          <DocumentInfoPanel
            documentId={previewImageId}
            currentDocument={currentDocument}
            canManageAccess={canManageAccess}
          />
        </div>
      </div>

      {/* Filmstrip — stays mounted so it can slide in / out with a height animation */}
      <div
        inert={diashowMode || !showFilmstrip}
        className={
          "flex-shrink-0 overflow-hidden transition-[height] duration-300 ease-in-out " +
          (!diashowMode && showFilmstrip ? "h-22" : "h-0")
        }
      >
        <div className="h-22 border-t border-border bg-surface-1">
          <PreviewFilmstrip
            filmstrip={filmstrip}
            onSelect={onThumbnailClicked}
          />
        </div>
      </div>
    </div>
  );
};
