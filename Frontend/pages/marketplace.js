import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Web3Modal from 'web3modal'
import Navbar from "../Component/Course/Nav";

import { createClient } from "urql";
import {
  marketplaceAddress
} from '../config'

import NFTMarketplace from '../artifacts/contracts/NFTMarketplace.sol/NFTMarketplace.json'
export default function Home() {

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
    /* create a generic provider and query for unsold market items */
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, provider)
    const data = await contract.fetchMarketItems()

    /*
    *  map over items returned from smart contract and format 
    *  them as well as fetch their token metadata
    */
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
        name: meta.data.name,
        description: meta.data.description,
      }
      return item
    }))
    setNfts(items)
    setLoadingState('loaded') 
  }
  async function buyNft(nft) {
    /* needs the user to sign the transaction, so will use Web3Provider and sign it */
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(marketplaceAddress, NFTMarketplace.abi, signer)

    /* user will be prompted to pay the asking proces to complete the transaction */
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether')   
    const transaction = await contract.createMarketSale(nft.tokenId, {
      value: price
    })
    await transaction.wait()
    loadNFTs()
  }
  if (loadingState === 'loaded' && !nfts.length) return (<h1 className="px-20 py-10 text-white text-3xl">No Courses in marketplace</h1>)
  return (
    <div className="flex mrkt justify-center">
  {/* <Navbar/> */}
  <div className="px-10" style={{ maxWidth: '1600px' }}>
    <div className="grid flex grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 unmrk">
      {nfts.map((nft, i) => (
        <div key={i} className="border rounded-t-md umrkt shadow rounded-xl overflow-hidden">
          <img
            height="250px"
            className="w-full rounded-t-md duration-200 hover:scale-110 hover:overflow-hidden"
            src={nft.image}
          />
          <div className="p-4">
            <p style={{ height: '100%' }} className="text-2xl font-semibold">
              {nft.name}
            </p>
            <div style={{ height: '70px', overflow: 'hidden' }}>
              <p className="text-gray-400">{nft.description}</p>
            </div>
          </div>
          <div className="p-4 umrk bg-black">
            <button
              className="hover:rotate-2 delay-100 transition ease-in-out text-center border hover:bg-gray-100 hover:shadow-md border-gray-500 rounded-md mt-4 w-full bg-green-500 text-cyan font-bold py-2 px-12 rounded"
              onClick={() => buyNft(nft)}
            >
              Buy
            </button>
          </div>
        </div>
      ))}
    </div>

    <div className="p-2 flex ml-12  pl-7 ">
      <div className='grid flex grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pl-12 gap-24 pt-4'>
        {tokens.length > 0 ? (
          tokens.map((token) => (
            <div className="" key={token.id}>
              <div className="border rounded-t-md umrkt shadow rounded-xl overflow-hidden">
                <div className="p-4 umrk bg-black">
                  <p className="text-2xl font-bold text-white">{token.price / 10 ** 18} MATIC</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div>No data available</div>
        )}

        {isLoading && <div>Loading...</div>}
      </div>
    </div>
  </div>
</div>

  )
}