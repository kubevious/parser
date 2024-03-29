import _ from 'the-lodash';
import { ILogger } from 'the-logger';
import { Context } from '../context';

export class DebugObjectLogger
{
    private _logger : ILogger;
    
    constructor(context : Context)
    {
        this._logger = context.logger;
    }

    dump(name: string, iteration: number, obj: any)
    {
        try
        {
            if (!process.env.LOG_TO_FILE) {
                return;
            }
    
            if (!obj) {
                return;
            }
    
            let writer = this._logger.outputStream(name + iteration + ".json");
            if (writer) {
                writer.write(_.cloneDeep(obj));
                writer.close();
            }
        }
        catch(reason)
        {
            this._logger.error("[DebugObjectLogger::dump] ", reason);
        }
    }
}
