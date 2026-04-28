import { logger } from '../logger';
import type {
  ThreadsUserProfile,
  ThreadsMediaContainer,
  ThreadsPublishResponse,
  ThreadsMediaObject,
  ThreadsConversationResponse,
} from '../types/threads.types';

const BASE_URL = 'https://graph.threads.net/v1.0';

const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;
const PUBLISH_POLL_INTERVAL_MS = 2_000;
const PUBLISH_POLL_TIMEOUT_MS = 30_000;

interface CircuitBreakerState {
  failures: number;
  state: 'closed' | 'open' | 'half-open';
  lastFailureTime: number;
}

export class ThreadsApi {
  private accessToken: string;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    state: 'closed',
    lastFailureTime: 0,
  };

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Internal request method with retry logic and circuit breaker pattern.
   */
  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Circuit breaker check
    if (this.circuitBreaker.state === 'open') {
      const elapsed = Date.now() - this.circuitBreaker.lastFailureTime;
      if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
        logger.info('Circuit breaker transitioning to half-open');
        this.circuitBreaker.state = 'half-open';
      } else {
        throw new Error(
          `Circuit breaker is open. Retry after ${Math.ceil((CIRCUIT_BREAKER_RESET_MS - elapsed) / 1000)}s`,
        );
      }
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          const errorBody = await response.text();
          const statusError = new Error(
            `Threads API error (${response.status}): ${errorBody}`,
          );

          // Don't retry client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            this.recordFailure();
            throw statusError;
          }

          throw statusError;
        }

        const data = (await response.json()) as T;

        // Successful request: reset circuit breaker
        if (this.circuitBreaker.state === 'half-open') {
          logger.info('Circuit breaker closing after successful half-open request');
        }
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'closed';

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn(
          { attempt, maxRetries: MAX_RETRIES, error: lastError.message },
          'Request attempt failed',
        );

        // If it was a non-retryable client error, don't retry
        if (lastError.message.includes('Threads API error (4') && !lastError.message.includes('(429)')) {
          break;
        }

        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          logger.debug({ backoffMs }, 'Waiting before retry');
          await this.sleep(backoffMs);
        }
      }
    }

    this.recordFailure();
    throw lastError ?? new Error('Request failed after all retries');
  }

  private recordFailure(): void {
    this.circuitBreaker.failures += 1;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.state = 'open';
      logger.error(
        { failures: this.circuitBreaker.failures },
        'Circuit breaker opened after repeated failures',
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch the authenticated user's profile.
   */
  async getUserProfile(): Promise<ThreadsUserProfile> {
    const fields = 'id,username,threads_profile_picture_url,threads_biography';
    return this.request<ThreadsUserProfile>(
      `${BASE_URL}/me?fields=${fields}&access_token=${this.accessToken}`,
    );
  }

  /**
   * Create a media container for a text post.
   */
  async createMediaContainer(
    text: string,
    replyToId?: string,
  ): Promise<ThreadsMediaContainer> {
    const userId = (await this.getUserProfile()).id;

    const body: Record<string, string> = {
      media_type: 'TEXT',
      text,
      access_token: this.accessToken,
    };

    if (replyToId) {
      body.reply_to_id = replyToId;
    }

    return this.request<ThreadsMediaContainer>(`${BASE_URL}/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /**
   * Publish a previously created media container.
   */
  async publishContainer(containerId: string): Promise<ThreadsPublishResponse> {
    const userId = (await this.getUserProfile()).id;

    return this.request<ThreadsPublishResponse>(`${BASE_URL}/${userId}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: this.accessToken,
      }),
    });
  }

  /**
   * Get a media object by ID.
   */
  async getMediaObject(mediaId: string): Promise<ThreadsMediaObject> {
    const fields =
      'id,text,timestamp,permalink,username,media_type,is_reply,root_post,replied_to,hide_status';
    return this.request<ThreadsMediaObject>(
      `${BASE_URL}/${mediaId}?fields=${fields}&access_token=${this.accessToken}`,
    );
  }

  /**
   * Get the conversation (all replies) for a media object.
   */
  async getConversation(mediaId: string): Promise<ThreadsConversationResponse> {
    const fields =
      'id,text,timestamp,permalink,username,media_type,is_reply,root_post,replied_to,hide_status';
    return this.request<ThreadsConversationResponse>(
      `${BASE_URL}/${mediaId}/conversation?fields=${fields}&access_token=${this.accessToken}`,
    );
  }

  /**
   * Get direct replies to a specific post.
   */
  async getReplies(mediaId: string): Promise<ThreadsConversationResponse> {
    const fields =
      'id,text,timestamp,permalink,username,media_type,is_reply,root_post,replied_to,hide_status';
    return this.request<ThreadsConversationResponse>(
      `${BASE_URL}/${mediaId}/replies?fields=${fields}&access_token=${this.accessToken}`,
    );
  }

  /**
   * Hide or unhide a reply.
   */
  async hideReply(replyId: string, hide: boolean): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`${BASE_URL}/${replyId}/manage_reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hide,
        access_token: this.accessToken,
      }),
    });
  }

  /**
   * Convenience method: create a text post and publish it.
   * Polls the container status for up to 30 seconds before publishing.
   */
  async createPost(text: string): Promise<ThreadsPublishResponse> {
    logger.info({ textLength: text.length }, 'Creating new post');

    const container = await this.createMediaContainer(text);
    logger.debug({ containerId: container.id }, 'Media container created');

    // Poll until the container is ready or timeout
    const startTime = Date.now();
    while (Date.now() - startTime < PUBLISH_POLL_TIMEOUT_MS) {
      try {
        const status = await this.request<{ id: string; status: string }>(
          `${BASE_URL}/${container.id}?fields=id,status&access_token=${this.accessToken}`,
        );

        if (status.status === 'FINISHED') {
          logger.debug({ containerId: container.id }, 'Container ready for publishing');
          break;
        }

        if (status.status === 'ERROR') {
          throw new Error(`Media container ${container.id} entered ERROR state`);
        }

        logger.debug(
          { containerId: container.id, status: status.status },
          'Container not yet ready, polling...',
        );
      } catch (error) {
        // If checking status fails, just continue polling
        logger.debug({ error }, 'Status check failed, retrying...');
      }

      await this.sleep(PUBLISH_POLL_INTERVAL_MS);
    }

    const result = await this.publishContainer(container.id);
    logger.info({ mediaId: result.id }, 'Post published successfully');
    return result;
  }

  /**
   * Convenience method: reply to an existing post.
   */
  async replyToPost(text: string, replyToId: string): Promise<ThreadsPublishResponse> {
    logger.info({ replyToId, textLength: text.length }, 'Creating reply');

    const container = await this.createMediaContainer(text, replyToId);
    logger.debug({ containerId: container.id }, 'Reply container created');

    // Poll until the container is ready or timeout
    const startTime = Date.now();
    while (Date.now() - startTime < PUBLISH_POLL_TIMEOUT_MS) {
      try {
        const status = await this.request<{ id: string; status: string }>(
          `${BASE_URL}/${container.id}?fields=id,status&access_token=${this.accessToken}`,
        );

        if (status.status === 'FINISHED') {
          break;
        }

        if (status.status === 'ERROR') {
          throw new Error(`Reply container ${container.id} entered ERROR state`);
        }
      } catch {
        // Continue polling on status check failure
      }

      await this.sleep(PUBLISH_POLL_INTERVAL_MS);
    }

    const result = await this.publishContainer(container.id);
    logger.info({ mediaId: result.id, replyToId }, 'Reply published successfully');
    return result;
  }
}
