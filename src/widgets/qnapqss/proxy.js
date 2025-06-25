import cache from "memory-cache";

import { httpProxy } from "utils/proxy/http";
import { formatApiCall } from "utils/proxy/api-helpers";
import getServiceWidget from "utils/config/service-helpers";


async function getWidget(req) {
  const { group, service, index } = req.query;
  console.log(`QNAP QSS - ${service} - Getting widget for service`)

  return await getServiceWidget(group, service, index);
}

async function login(widget, service) {
  const endpoint = '{url}/api/v1/users/login';
  const loginUrl = formatApiCall(endpoint, widget);

  const loginBody = { username: widget.username, password: Buffer.from(widget.password).toString('base64') };

  const [status, , data, ,] = await httpProxy(loginUrl, {
    method: "POST",
    body: JSON.stringify(loginBody),
  });

  if (status != 200) {
    const respData = data.toString();
    logger.error(`QNAP QSS - ${service} - HTTP ${status} status. Data: ${respData}`);

    return [status, respData, null]
  }

  const token = JSON.parse(data.toString())['result'];

  return [status, data, token];
}

async function getToken(widget, service) {
  // Attempt to get Bearer-Token
  const loginCacheKey = `qnap-qss-bearer-token.${service}`;
  
  console.log(`QNAP QSS - ${service} - Getting cached token`)
  let token = cache.get(loginCacheKey);

  // Get a login token if one isn't cached
  if (token === null) {
    console.warn(`QNAP QSS - ${service} - No token found, requesting a new one`);
    const [status, data, newToken] = await login(widget, service);

    if (status !== 200) {
      const errMsg = { error: { message: `QNAP QSS - ${service} - HTTP error communicating with API`, data: data.toString() } }
      console.error(errMsg);

      return null;
    }

    token = cache.put(loginCacheKey, newToken);
  }

  return token;
}

async function renewToken(widget, service) {
  const loginCacheKey = `qnap-qss-bearer-token.${service}`;
  
  console.info(`QNAP QSS - ${service} - Renewing token`);
  const [status, data, newToken] = await login(widget, service);

  if (status !== 200) {
    const errMsg = { error: { message: `QNAP QSS - ${service} - Error renewing token`, data: data.toString() } }
    console.error(errMsg);
  }

  const token = cache.put(loginCacheKey, newToken);

  return token;
}

/**
 * Get data from the QNAP QSS API
 * 
 * @param {string} url 
 * @param {string} token 
 * @returns {Promise<{status: number, error: bool, data: any}>}
 */
async function getApi(url, token, service) {
  const params = { headers: { "authorization": `Bearer ${token}` } };

  console.log(`QNAP QSS - ${service} - Making API call to ${url}`);
  const [status, , data] = await httpProxy(url, params);

  if (status !== 200) {
    console.error(`QNAP QSS - ${service} - Status: ${status} - ${data.toString()} - Failed to get from ${url}`)
    return { status, error: true, data }
  }

  const results = JSON.parse(data.toString())['result'];

  return { status, error: false, data: results }
}


export default async function qnapQssProxyHandler(req, res, map) {
  const { endpoint, service } = req.query;
  const endpoints = endpoint; // Widget is configured with an Array of endpoints

  const endpointTemplate = "{url}/api/v1/{endpoint}";

  const widget = await getWidget(req);
  const token = await getToken(widget, service);

  if (!token) {
    const errMsg = `QNAP QSS - Unable to get token for ${service}`;
    return res
      .status(401)
      .json({ error: { message: errMsg, data: results.data.toString() } });
  }

  const respData = []

  for (const endpoint of endpoints) {
    const url = formatApiCall(endpointTemplate, { endpoint, url: widget.url });
    let results = await getApi(url, token, service);

    if (results.status === 401) {
      // Renew token and try again
      await renewToken(widget, service);
      results = await getApi(url, token, service);
    }

    if (results.error) {
      const errMsg = `QNAP QSS - ${service} - Failed to get from API`;
      return res
        .status(400)
        .json({ error: { message: errMsg, data: results.data.toString() } });
    }

    respData.push(results.data);
  }

  if (map) {
    return res.status(200).send(map(respData));
  }

  return res.status(200).send(respData);
}
