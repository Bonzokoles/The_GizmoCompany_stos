export interface MediaItem {
  key: string;
  name: string;
  type: "audio" | "video" | "image" | "other";
  size?: number;
  url?: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface MediaHubTabProps {
  mediaList: MediaItem[];
  mediaLoading: boolean;
  selectedMedia: MediaItem | null;
  playingMedia: MediaItem | null;
  mediaFilter: "all" | "audio" | "video" | "image";
  setMediaFilter: (f: "all" | "audio" | "video" | "image") => void;
  generatedMetadata: string;
  metadataLoading: boolean;
  uploadLoading: boolean;
  jimboOnline: boolean;
  handleLoadMedia: (type?: string) => void;
  handleGenerateMetadata: (key: string) => void;
  handleSelectMedia: (item: MediaItem) => void;
  handlePlayMedia: (item: MediaItem) => void;
  handleUploadMedia: (file: File) => void;
}
