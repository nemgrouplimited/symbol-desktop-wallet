/*
 * Copyright 2020 NEM (https://nem.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 *
 */

export class CommonHelpers {
    /**
     * Helper method to sleep for ms miliseconds
     * @param {string} text
     * @return {boolean}
     */
    public static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, ms);
        });
    }

    /**
     * Helper method to retry opening websocket n times asynchronously
     */
    public static async retryNTimes(listener, trials: number, interval: number) {
        if (trials < 1) {
            throw new Error('could not connect');
        }
        let attemptCount = 0;
        while (!listener.isOpen()) {
            try {
                return await listener.open();
            } catch (error) {
                if (++attemptCount >= trials) {
                    throw error;
                }
            }
            await this.sleep(interval);
        }
    }
    public static parseObjectProperties(obj, parse) {
        for (const k in obj) {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
                this.parseObjectProperties(obj[k], parse);
            } else if (Object.prototype.hasOwnProperty.call(obj, k)) {
                parse(k, obj[k]);
            }
        }
    }
}
