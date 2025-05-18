import axios from 'axios';
import { config } from '../config.js';
import { redisService } from './redis.service.js';
/**
 * Notification service for sending issue alerts
 * Implements debouncing to prevent notification spam
 */
export class NotificationService {
    debounceWindow = config.patterns.debounceWindow;
    issueThreshold = config.patterns.issueThreshold;
    /**
     * Process a newly detected or updated issue
     * @param issue The issue to process
     * @param isNew Whether the issue is newly created
     * @returns Whether a notification was sent
     */
    async processIssue(issue, isNew) {
        // Only notify if the issue has reached the threshold count
        if (issue.count < this.issueThreshold) {
            return false;
        }
        // If already notified, check debounce window
        if (issue.notified && issue.notifiedAt) {
            const lastNotified = new Date(issue.notifiedAt).getTime();
            const now = new Date().getTime();
            // Skip if within debounce window
            if (now - lastNotified < this.debounceWindow) {
                return false;
            }
        }
        // If we're here, we should notify
        const didNotify = await this.sendNotification(issue);
        if (didNotify) {
            // Mark issue as notified in Redis
            await redisService.markIssueNotified(issue.runId, issue.fingerprint);
            return true;
        }
        return false;
    }
    /**
     * Send a notification for an issue
     * @param issue The issue to notify about
     * @returns Whether the notification was successfully sent
     */
    async sendNotification(issue) {
        const callbackUrl = await redisService.getCallback(issue.runId);
        // If no callback URL is registered, log but don't fail
        if (!callbackUrl) {
            console.info(`No callback URL registered for run ${issue.runId}, issue "${issue.fingerprint}" not sent`);
            return false;
        }
        try {
            // Prepare notification payload
            const payload = {
                issue,
                runId: issue.runId,
                timestamp: new Date().toISOString(),
            };
            // Send notification to callback URL
            const response = await axios.post(callbackUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000, // 5 second timeout
            });
            if (response.status >= 200 && response.status < 300) {
                console.info(`Notification sent for issue "${issue.fingerprint}" in run ${issue.runId}`);
                return true;
            }
            else {
                console.warn(`Failed to send notification for issue "${issue.fingerprint}": HTTP ${response.status}`);
                return false;
            }
        }
        catch (error) {
            console.error(`Error sending notification for issue "${issue.fingerprint}":`, error);
            return false;
        }
    }
    /**
     * Checks if it's appropriate to notify about an issue
     * @param issue The issue to check
     * @returns Whether notification should proceed
     */
    shouldNotify(issue) {
        // Check threshold
        if (issue.count < this.issueThreshold) {
            return false;
        }
        // If already notified, check debounce window
        if (issue.notified && issue.notifiedAt) {
            const lastNotified = new Date(issue.notifiedAt).getTime();
            const now = new Date().getTime();
            // Skip if within debounce window
            if (now - lastNotified < this.debounceWindow) {
                return false;
            }
        }
        return true;
    }
}
// Export singleton instance
export const notificationService = new NotificationService();
