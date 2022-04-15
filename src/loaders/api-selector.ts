import _ from 'the-lodash';
import { KubernetesObject } from "k8s-super-client";
import { ILogger } from "the-logger";

type SanitizerCb = (obj: KubernetesObject) => KubernetesObject;
export class K8sApiSelector
{
    private _logger : ILogger;

    private _useIncludeFilter = false;
    private _inclusion : ApiGroupMatcher<boolean> = new ApiGroupMatcher<boolean>(false);
    private _exclusion : ApiGroupMatcher<boolean> = new ApiGroupMatcher<boolean>(false);
    private _sanitizers : ApiGroupMatcher<SanitizerCb | null> = new ApiGroupMatcher<SanitizerCb | null>(null);

    constructor(logger: ILogger)
    {
        this._logger = logger;

        this._setup();
    }

    isEnabled(apiName: string | null, versionOnly: string, kindName: string)
    {
        if (this._useIncludeFilter) {
            if (!this._inclusion.matches(apiName, versionOnly, kindName)) {
                return false;
            }
        }

        if (this._exclusion.matches(apiName, versionOnly, kindName)) {
            return false;
        }
        
        return true;
    }

    sanitize(obj: KubernetesObject) : KubernetesObject
    {
        const apiInfo = parseAPIVersion(obj);

        const cb = this._sanitizers.matches(apiInfo.api, apiInfo.version, apiInfo.kind);
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

        this._setupDeprecated();

        if (process.env.KUBEVIOUS_API_SKIP_SECRET == 'true')
        {
            this._setupSecretExclusion();
        }
    }

    private _setupDeprecated()
    {
        this._exclusion.add(null, 'v1', 'Binding', true);
        this._exclusion.add(null, 'v1', 'ComponentStatus', true);
    }

    private _setupSecretExclusion()
    {
        this._exclusion.add(null, null, 'Secret', true);
    }

    private _setupSanitizers()
    {
        this._sanitizers.add(null, 'v1', 'Secret', this._sanitizeSecret.bind(this));
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

export class ApiGroupMatcher<T>
{
    private _defaultValue: T;
    private _dict: Record<string, Record<string, Record<string, T>>> = {};

    constructor(defaultValue: T)
    {
        this._defaultValue = defaultValue;
    }

    add(apiName: string | null, version: string | null, kind: string, value: T)
    {
        apiName = apiName ?? '';
        version = version ?? '';
        if (!this._dict[apiName]) {
            this._dict[apiName] = {};
        }
        if (!this._dict[apiName][version]) {
            this._dict[apiName][version] = {};
        }
        this._dict[apiName][version][kind] = value;
    }

    matches(apiName: string | null, version: string, kind: string)
    {
        apiName = apiName ?? '';
        const apiNameDict = this._dict[apiName];
        if (!apiNameDict) {
            return this._defaultValue;
        }

        if (apiNameDict[version]) {
            return apiNameDict[version][kind] ?? this._defaultValue;
        } else {
            if (apiNameDict['']) {
                return apiNameDict[''][kind] ?? this._defaultValue;
            }
        }

        return this._defaultValue;
    }
}

function parseAPIVersion(obj : KubernetesObject)
{
    const apiParts = obj.apiVersion.split('/');
    let api : string | null = null;
    let version : string;
    if (apiParts.length == 2) {
        api = apiParts[0];
        version = apiParts[1];
    } else {
        api = null;
        version = apiParts[0];
    }

    return {
        api: api,
        version: version,
        kind: obj.kind
    }
}
