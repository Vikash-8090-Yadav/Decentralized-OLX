import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from 'web3modal'

import { createClient } from "urql";
import {
  marketplaceAddress
} from '../config'

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'

export default function CreatorDashboard() {


  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  useEffect(() => {
    loadNFTs()
  }, [])



  const QueryURL = "https://api.studio.thegraph.com/query/54911/decentralised-olx/v0.0.1";

  let query = `
    {
      marketItemCreateds {
        price
        seller
        sold
        tokenId
        owner
      }
    }
  `;

  const client = createClient({
    url: QueryURL
  });

  useEffect(() => {
    if (!client) {
      return;
    }

    const getTokens = async () => {
      try {
        const { data } = await client.query(query).toPromise();
        setTokens(data.marketItemCreateds);
        console.log(data.marketItemCreateds);
        setIsLoading(false); // Data is loaded
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    getTokens();
  }, [client]);





  async function loadNFTs() {
    const web3Modal = new Web3Modal({
      network: 'mainnet',
      cacheProvider: true,
    })
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()

    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)
    const data = await contract.fetchItemsListed()

    const items = await Promise.all(data.map(async i => {
      const tokenUri = await contract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      let item = {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
      }
      return item
    }))

    setNfts(items)
    setLoadingState('loaded') 
  }
  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="py-10  text-whitepx-20 text-3xl">No Courses listed</h1>)
  return (
    <div>
      <div className="p-4">
        <h2 className="text-2xl py-2">Items Listed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
            nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} className="rounded" />
          
              </div>
            ))
          }
          {isLoading ? (
        // Show loading indicator while data is being fetched
        <div>Loading...</div>
      ) : tokens.length > 0 ? (
        tokens.map((token) => (
          <div className="subcnt" key={token.id}>
            <div className="p-4  umrk bg-black">
            <p className="text-2xl font-bold text-white">{token.price / 10**18} MATIC</p>

          </div>
            </div>
        ))
      ) : (
        <div>No data available</div>
      )}
        </div>
      </div>
    </div>
  )
}