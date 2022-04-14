import { ILogger } from "the-logger";
import { Context } from "../context";

import { BackendMetricItem, BackendMetricsResponse } from '@kubevious/ui-middleware'

import VERSION from '../version';


export class BackendMetrics
{
    private _context : Context;
    private _logger : ILogger;

    constructor(context : Context)
    {
        this._context = context;
        this._logger = context.logger.sublogger("BackendMetrics");
    }

    get logger() {
        return this._logger;
    }

    extractMetrics() 
    {
        const metrics: BackendMetricItem[] = [];

        metrics.push({
            category: "Parser",
            name: "Version",
            value: VERSION
        });

        metrics.push({
            category: "Parser",
            name: "K8s Connected",
            value: this._context.areLoadersReady
        });


        
        metrics.push({
            category: "Parser",
            name: "Report Start Count",
            value: this._context.reporter.counters.reportStartCount
        });
        metrics.push({
            category: "Parser",
            name: "Report Success Count",
            value: this._context.reporter.counters.reportSuccessCount
        });
        metrics.push({
            category: "Parser",
            name: "Report Fail Count",
            value: this._context.reporter.counters.reportFailCount
        });

        metrics.push({
            category: "Parser",
            name: "Last Report Start Date",
            value: this._context.reporter.counters.lastReportStartDate ?? ''
        });
        metrics.push({
            category: "Parser",
            name: "Last Report Success Date",
            value: this._context.reporter.counters.lastReportSuccessDate ?? ''
        });
        metrics.push({
            category: "Parser",
            name: "Last Report Fail Date",
            value: this._context.reporter.counters.lastReportFailDate ?? ''
        });


        metrics.push({
            category: "Parser",
            name: "Registry Items Count",
            value: this._context.concreteRegistry.itemCount
        });
        
        for(const x of this._context.concreteRegistry.groupCounts)
        {
            metrics.push({
                category: "Parser",
                name: `Registry Kind ${x.group} Count`,
                value: x.count
            }); 
        }
        
        return metrics;
    }

}