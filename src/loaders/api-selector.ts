import _ from 'the-lodash';
import { KubernetesObject } from "k8s-super-client";
import { ILogger } from "the-logger";

import { DEFAULT_API_GROUPS } from './default-api-groups'

type SanitizerCb = (obj: KubernetesObject) => KubernetesObject;
export class K8sApiSelector
{
    private _logger : ILogger;

    private _useIncludeFilter : boolean = false;
    private _inclusion : Record<string, boolean> = {};
    private _exclusion : Record<string, boolean> = {};

    private _sanitizers : Record<string, SanitizerCb> = {};

    constructor(logger: ILogger)
    {
        this._logger = logger;

        this._setup();
    }

    isEnabled(apiName: string | null, apiVersion: string, kindName: string)
    {
        const key = makeKey(apiName, kindName);

        if (this._useIncludeFilter) {
            if (!this._inclusion[key]) {
                return false;
            }
        }

        if (this._exclusion[key]) {
            return false;
        }
        
        return true;
    }

    sanitize(obj: KubernetesObject) : KubernetesObject
    {
        const key = makeKey(obj.apiVersion, obj.kind);
        const cb = this._sanitizers[key];
        if (cb) {
            // TODO: Next line is a temporary workaround because there is an issue in k8s-client library.
            // Without it there is an "Final Delta After Recover Should Be Empty!" error.
            const clone = _.cloneDeep(obj);
            return cb(clone);
        }
        return obj;
    }

    private _setup()
    {
        this._setupSanitizers();

        if (process.env.KUBEVIOUS_API_MINIMAL == 'true')
        {
            this._setupDefault();
        }

        if (process.env.KUBEVIOUS_API_SKIP_SECRET == 'true')
        {
            this._setupSecretExclusion();
        }
    }

    private _setupDefault()
    {
        this._useIncludeFilter = true;
        for(let group of DEFAULT_API_GROUPS)
        {
            for(let kind of group.kinds)
            {
                const key = makeKey(group.api, kind);
                this._inclusion[key] = true;
            }
        }
    }

    private _setupSecretExclusion()
    {
        this._exclusion[makeKey(null, 'Secret')] = true;
    }

    private _setupSanitizers()
    {
        this._setupSanitizer('v1', 'Secret', this._sanitizeSecret.bind(this));
    }

    private _setupSanitizer(apiNameAndVersion: string, kindName: string, cb: SanitizerCb)
    {
        const key = makeKey(apiNameAndVersion, kindName);
        this._sanitizers[key] = cb;
    }

    private _sanitizeSecret(obj: KubernetesObject) : KubernetesObject
    {
        if (obj.data)
        {
            obj.data = _.makeDict(_.keys(obj.data), x => x, x => null);
        }
        return obj;
    }

}

function makeKey(apiName: string | null, kindName: string)
{
    if (apiName) {
        return `${apiName}:${kindName}`;
    }
    return kindName;;
}