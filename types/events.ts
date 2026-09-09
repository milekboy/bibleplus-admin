export type EventStatus = "upcoming" | "ongoing" | "past" | string;
export interface EventSpeaker { _id: string; name: string; bio?: string; title?: string; image?: string; }
export interface EventCategory { _id: string; name: string; icon?: string; }
export interface EventMedia { url?: string; file?: string; }
export interface EventRecord {
  _id: string;
  title: string;
  name?: string;
  description?: string;
  category?: string | EventCategory;
  location?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  status?: EventStatus;
  speakers?: Array<EventSpeaker | string>;
  coverImage?: string;
  banner?: string;
  gallery?: Array<EventMedia | string>;
  isOnline?: boolean;
  isLive?: boolean;
  liveStream?: { platform?: string; url?: string; thumbnail?: string };
  livestreamUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface EventPayload {
  title: string;
  description: string;
  category?: string;
  location?: string;
  startDate: string;
  endDate: string;
  speakers?: string[];
  coverImage?: string;
  gallery?: string[];
  isOnline?: boolean;
  liveStream?: { platform?: string; url?: string; thumbnail?: string };
}
export type EventView = "all" | "upcoming" | "past";