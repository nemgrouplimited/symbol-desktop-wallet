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

import { NodeModel } from './NodeModel';

export class HarvestingModel {
    public readonly accountAddress: string;
    public readonly isPersistentDelReqSent?: boolean;
    public readonly selectedHarvestingNode?: NodeModel;
    public readonly encRemotePrivateKey?: string;
    public readonly newEncRemotePrivateKey?: string;
    public readonly newRemotePublicKey?: string;
    public readonly encVrfPrivateKey?: string;
    public readonly newEncVrfPrivateKey?: string;
    public readonly newVrfPublicKey?: string;
    public readonly delegatedHarvestingRequestFailed?: boolean;
}
