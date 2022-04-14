

export interface CollectorConfig
{
    url: string
    authUrl?: string
    keyPath?: string
}

export interface ReporterAuthResponse
{
    token: string
}


export interface Counter
{
    reportStartCount: number;
    reportSuccessCount: number;
    reportFailCount: number;

    lastReportStartDate: Date | null;
    lastReportSuccessDate: Date | null;
    lastReportFailDate: Date | null;
}