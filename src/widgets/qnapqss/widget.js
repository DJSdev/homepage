import qnapQssProxyHandler from './proxy'

const widget = {
  api: "{url}",
  proxyHandler: qnapQssProxyHandler,

  mappings: {
    "poe": {
      endpoint: ["poe/port/status", "poe"],
      map: (responses) => {
        const results = {}

        for (let resp of responses) {
          // For "poe"
          if (resp['MaxPower'] !== undefined) {
            results['maxPower'] = resp['MaxPower'];
          }

          // For "poe/port/status"
          if (Array.isArray(resp)) {
            results["wattsUsed"] = resp.reduce((acc, port) => acc + port['val']['PowerConsumption'] * 0.1, 0);
            console.log(resp.length)
            results["totalPoePorts"] = resp.length;
            results["numOfPoeDevices"] = resp.reduce((acc, port) => {
                if (port['val']['CurrentState'] === "poweredDeviceOn") {
                  return acc += 1;
                }
                return acc;
              }, 0)
          }
        }

        return results;
      }
    },
    "sensor": {
      endpoint: ["system/sensor"],
      map: (responses) => {
        const results = {};

        for (let resp of responses) {
          if (resp['SwitchTemp'] !== undefined) {
            results['switchTempC'] = resp['SwitchTemp'];
          }
        }

        return results;
      }
    },
    "activeports": {
      endpoint: ["ports/status"],
      map: (responses) => {
        const results = {};

        for (let resp of responses) {
          if (Array.isArray(resp)) {
            results["activePorts"] = resp.reduce((acc, port) => {
              if (port["val"]["Link"] === true) {
                return acc += 1;
              } 
              return acc;
            }, 0);
          }
        }

        return results;
      }
    }
  },
};

export default widget;
