/** global Helia, Libp2P, ChainsafeLibp2PYamux, Libp2PWebsockets, Libp2PBootstrap, BlockstoreCore, DatastoreCore */

// not imported from skypack,jsdelivr, nor unpkg because of issues.
// import { noise } from "https://esm.sh/v111/@chainsafe/libp2p-noise@11.0.1/es2022/libp2p-noise.js";
import { MemoryDatastore } from "datastore-core";
import { MemoryBlockstore } from "blockstore-core";
import { LevelDatastore } from "datastore-level";
import { ipns, ipnsValidator, ipnsSelector } from "@helia/ipns";
import { dht, pubsub } from "@helia/ipns/routing";
import { strings } from "@helia/strings";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { kadDHT } from "@libp2p/kad-dht";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { bootstrap } from "@libp2p/bootstrap";



import { createHelia as InstantiateHelia } from "helia";
import { unixfs } from "@helia/unixfs";

const statusEl = document.getElementById("status");
const statusValueEl = document.getElementById("statusValue");
const discoveredPeerCount = document.getElementById("discoveredPeerCount");
const connectedPeerCount = document.getElementById("connectedPeerCount");
const connectedPeersList = document.getElementById("connectedPeersList");
const multiaddrList = document.getElementById("helia-multiaddrs");

let nodeUpdateInterval = null;
document.addEventListener("DOMContentLoaded", async () => {


///
const libp2p = await createLibp2p({
  transports: [webSockets()],
  peerDiscovery: [
      bootstrap({
        list: [
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
          "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
          "/dns4/beta-ipfs.yourself.dev/tcp/443/wss/p2p/12D3KooWJj5EVci5yDVqrN5q6pqmVztDo5RsZJSzQBHDU6tGU7wN"           
        ],
      }),
    ],
  dht: kadDHT({
      validators: {
          ipns: ipnsValidator,
      },
      selectors: {
          ipns: ipnsSelector,
      },
  }),
  // services: { pubsub: gossipsub({allowPublishToZeroPeers: true}) },
  
});


  ///
  window.helia = await createHelia({libp2p});
  await helia.libp2p.services.dht.setMode("server");
  window.heliaFs = unixfs(helia);
////CUSTOM


const name = ipns(helia, [dht(helia)]); 


// const keyInfo = await helia.libp2p.keychain.createKey("key1", "secp256k1");
        // const keyInfo = {"id": "QmNg5g4ArUnDu8oX6GabBKKfx3e9RHbNfXxcEphUMa9RVi", "name": "key1"};
        // console.log('keyInfo :>> ', keyInfo);
        const peerId = await helia.libp2p.keychain.exportPeerId('key1');
        console.log('peerId :>> ', peerId);
        const s = strings(helia);
        
setInterval(async() => {
  try {
    const date = { date: new Date().toISOString() };

        console.log('date before resolution :>> ', date);
        const myImmutableAddress = await s.add(JSON.stringify(date));
        let cid = myImmutableAddress.toString();
      // publish the name
      const ipns = await name.publish(peerId, cid);
      console.log('ipns link :>> ', ipns.value.toString);

      // resolve the name
      cid = await name.resolve(peerId);
      console.log('After Resolution CID :>> ', cid);
      console.log(" contents after resolution: ", await s.get(cid));
  } catch (err) {
      console.log(err);
  }
  
}, 5000);

        /////////////////////END CUSTOM


  helia.libp2p.addEventListener("peer:discovery", (evt) => {
    discoveredPeers.set(evt.detail.id.toString(), evt.detail);
    addToLog(`Discovered peer ${evt.detail.id.toString()}`);
  });

  helia.libp2p.addEventListener("peer:connect", (evt) => {
    addToLog(`Connected to ${evt.detail.toString()}`);
  });
  helia.libp2p.addEventListener("peer:disconnect", (evt) => {
    addToLog(`Disconnected from ${evt.detail.toString()}`);
  });

  nodeUpdateInterval = setInterval(async () => {
    let statusText = helia.libp2p.isStarted() ? "Online" : "Offline";
    const dhtMode = await helia.libp2p.services.dht.getMode();
    statusText = `${statusText} - ${
      dhtMode === "client" ? "DHT Client" : "DHT Server"
    }`;
    statusValueEl.innerHTML = statusText;
    updateConnectedPeers();
    updateDiscoveredPeers();
    setMultiaddrs();
  }, 500);

  const id = await helia.libp2p.peerId.toString();

  const nodeIdEl = document.getElementById("nodeId");
  nodeIdEl.innerHTML = id;

  /**
   * You can write more code here to use it.
   *
   * https://github.com/ipfs/helia
   * - helia.start
   * - helia.stop
   *
   * https://github.com/ipfs/helia-unixfs
   * - heliaFs.addBytes
   * - heliaFs.addFile
   * - heliaFs.ls
   * - heliaFs.cat
   */
});

function ms2TimeString(a) {
  const k = a % 1e3;
  const s = (a / 1e3) % 60 | 0;
  const m = (a / 6e4) % 60 | 0;
  const h = (a / 36e5) % 24 | 0;

  return (
    (h ? (h < 10 ? "0" + h : h) + ":" : "00:") +
    (m < 10 ? 0 : "") +
    m +
    ":" +
    (s < 10 ? 0 : "") +
    s +
    ":" +
    (k < 100 ? (k < 10 ? "00" : 0) : "") +
    k
  );
}

const logEl = document.getElementById("runningLog");

const getLogLineEl = (msg) => {
  const logLine = document.createElement("span");
  logLine.innerHTML = `${ms2TimeString(performance.now())} - ${msg}`;

  return logLine;
};
const addToLog = (msg) => {
  logEl.appendChild(getLogLineEl(msg));
};

let heliaInstance = null;
const createHelia = async () => {
  // application-specific data lives in the datastore
  const datastore = new LevelDatastore("helia-example");
  const blockstore = new MemoryBlockstore();

  if (heliaInstance != null) {
    return heliaInstance;
  }

  heliaInstance = await InstantiateHelia({
    datastore,
    blockstore,
  });
  addToLog("Created Helia instance");

  return heliaInstance;
};

window.discoveredPeers = new Map();

const updateConnectedPeers = () => {
  const peers = helia.libp2p.getPeers();
  connectedPeerCount.innerHTML = peers.length;
  connectedPeersList.innerHTML = "";
  for (const peer of peers) {
    const peerEl = document.createElement("li");
    peerEl.innerText = peer.toString();
    connectedPeersList.appendChild(peerEl);
  }
};

function maToSelector(string) {
  // #id-ma-/ip4/139.178.91.71/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/webrtc/p2p/12D3KooWS2Tw7FNsPGBYZ9hBqaa4woNfdfTizgR5y4caqyaogSYh
  return string.replace(/[/.]/gim, "-");
}

function setMultiaddrs() {
  // multiaddrList.innerHTML = "";
  // console.log(helia.libp2p.getMultiaddrs().map((ma) => ma.toString()).join(', '))
  const multiaddrs = helia.libp2p.getMultiaddrs();
  // if (multiaddrs.length === 0) {
  //   return
  // }
  const actualMultiaddrStrings = multiaddrs.map((ma) => ma.toString());
  const displayedMultiaddrStrings = Array.from(
    multiaddrList.querySelectorAll("li")
  ).map((el) => el.id.replace("id-ma-", ""));

  displayedMultiaddrStrings
    .filter((displayedMa) => !actualMultiaddrStrings.includes(displayedMa))
    .forEach((maToRemove) => {
      multiaddrList
        .querySelector(`#id-ma-${maToSelector(maToRemove)}`)
        ?.remove();
    });
  actualMultiaddrStrings
    .filter((maToAdd) => !displayedMultiaddrStrings.includes(maToAdd))
    .forEach((maToAdd) => {
      const maListItemEl = document.createElement("li");
      maListItemEl.setAttribute("id", `id-ma-${maToSelector(maToAdd)}`);
      maListItemEl.innerText = maToAdd;
      multiaddrList.appendChild(maListItemEl);
    });
  // remove listed multiaddresses if they're no longer being returned by libp2p
  // multiaddrList.querySelectorAll('li')
  // actualMultiaddrStrings.forEach((maString) => {
  //   const maListItemEl = document.createElement("li");
  //   maListItemEl.setAttibute("id", `id-ma-${maString}`);
  //   maListItemEl.innerText = maString;
  //   multiaddrList.appendChild(maListItemEl);
  // });
}

const updateDiscoveredPeers = () => {
  discoveredPeerCount.innerHTML = discoveredPeers.size;
};
