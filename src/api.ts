import { HeaderOptionType, SupergoodPayloadType } from './index.d';
import axios from 'axios';
import fs from 'fs';

const postEvents = async (
  eventSinkUrl: string,
  data: Array<SupergoodPayloadType>,
  options: HeaderOptionType
) => {
  const response = await axios.post(eventSinkUrl, data, options);
  if (response.status === 200) {
    return response.data;
  } else {
    return {};
  }
};

const dumpDataToDisk = (data: Array<SupergoodPayloadType>) => {
  const logFileName = `supergood_${new Date()
    .toISOString()
    .replace(/[:|.]/g, '-')}.log`;
  const dataStr = JSON.stringify(data, null, 2);
  fs.writeFileSync(logFileName, dataStr, {});
};

export { postEvents, dumpDataToDisk };
