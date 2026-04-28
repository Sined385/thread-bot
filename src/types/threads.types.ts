export interface ThreadsTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ThreadsLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ThreadsUserProfile {
  id: string;
  username: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
}

export interface ThreadsMediaContainer {
  id: string;
}

export interface ThreadsPublishResponse {
  id: string;
}

export interface ThreadsMediaObject {
  id: string;
  text?: string;
  timestamp?: string;
  permalink?: string;
  username?: string;
  media_type?: string;
  is_reply?: boolean;
  root_post?: { id: string };
  replied_to?: { id: string };
  hide_status?: string;
}

export interface ThreadsConversationResponse {
  data: ThreadsMediaObject[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

export interface ThreadsWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: {
      item: string;
      verb: string;
      thread_id?: string;
      parent_id?: string;
      media_id?: string;
      text?: string;
      from?: { id: string; username: string };
      timestamp: number;
    };
  }>;
}

export interface ThreadsWebhookPayload {
  object: string;
  entry: ThreadsWebhookEntry[];
}

export type DraftType = 'original_post' | 'reply' | 'mention_reply' | 'keyword_reply';
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'published' | 'failed';
export type TriggerSource = 'scheduled' | 'webhook_comment' | 'webhook_mention' | 'keyword_match' | 'manual';
