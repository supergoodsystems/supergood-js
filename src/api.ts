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
  // Only create a logfile once a day
  const logFileName = `supergood_${new Date()
    .toISOString()
    .split('T')[0]
    .replace(/[:|.]/g, '-')}.log`;
  data.forEach((payload) =>
    fs.writeFileSync(logFileName, JSON.stringify(payload, null, 2), {
      flag: 'wx'
    })
  );
};

export { postEvents, dumpDataToDisk };
