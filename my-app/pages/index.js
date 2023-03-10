import Head from 'next/head'
import {Contract, providers, utils, BigNumber, ethers} from 'ethers'
import styles from '@/styles/Home.module.css'
import Web3Modal from 'web3modal';
import React,{useState, useRef, useEffect} from 'react';
import {FETCH_CREATED_GAME} from '../queries';
import {subgraphQuery} from '../utils';
import { RANDOM_GAME_CONTRACT_ADDRESS, RANDOM_GAME_ABI } from '@/constants';

export default function Home() {

const zero = BigNumber.from('0');
const web3ModalRef = useRef();  
const [walletConnected, setWalletConnected] = useState(false);

const[isOwner, setIsOwner] = useState(false);

const[loading, setLoading] = useState(false);

const [gameStarted, setGameStarted] = useState(false);
const [entryFee, setEntryFee] = useState(zero);
const [maxPlayers, setMaxPlayers] = useState(0);
const [winner, setWinner] = useState();
// Keep a track of all the logs for a given game
const [logs, setLogs] = useState([]);
// Players that joined the game
const [players, setPlayers] = useState([]);

  // This is used to force react to re render the page when we want to
  // in our case we will use force update to show new logs
  const forceUpdate = React.useReducer(() => ({}), {})[1];



  const getProviderOrSigner = async(needSigner = false) => {

  const provider = await web3ModalRef.current.connect();
  const web3Provider = new providers.Web3Provider(provider);

  const {chainId} = await web3Provider.getNetwork();

  if(chainId !== 80001) {
    window.alert("Please connect to Polygon Mumbai!");
    throw new Error("Not connected to Mumbai Network");
  }

  if(needSigner) {
    const signer = web3Provider.getSigner();
    return signer;
  }
  return web3Provider;
};

const connectWallet = async() => {
  try {
    // Get the provider from web3Modal, which in our case is MetaMask
    // When used for the first time, it prompts the user to connect their wallet
    await getProviderOrSigner();
    setWalletConnected(true);
    
  } catch (err) {  
    console.error(err);
  }
};


const startGame = async() => {
  try {
    const signer = await getProviderOrSigner(true);
      // We connect to the Contract using a signer because we want the owner to sign the transaction
      
      const randomGameContract = new Contract(RANDOM_GAME_CONTRACT_ADDRESS, RANDOM_GAME_ABI, signer);
      setLoading(true);
      // call the startGame function from the contract
      const tx = await randomGameContract.startGame(maxPlayers, entryFee);
      await tx.wait();

      setLoading(false);

  } catch (err) {
    console.error(err);
    setLoading(false);
  }
};


const joinGame = async() => {
  try {

    const signer = await getProviderOrSigner(true);
    const randomGameContract = new Contract(RANDOM_GAME_CONTRACT_ADDRESS, RANDOM_GAME_ABI, signer);
    setLoading(true);

    const tx = await randomGameContract.joinGame({
      value: entryFee,
    });
    await tx.wait();
    setLoading(false);
    
  } catch (err) {

    console.error(err);
    setLoading(false);
  }
};

  /**
   * checkIfGameStarted checks if the game has started or not and intializes the logs
   * for the game
   */

  const checkIfGameStarted = async() => {
    try {
      const provider = await getProviderOrSigner();
      const randomGameContract = new Contract(RANDOM_GAME_CONTRACT_ADDRESS, RANDOM_GAME_ABI, provider);

      const _gameStarted = await randomGameContract.gameStarted();

      const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
      const _game = _gameArray.games[0];
      let _logs = [];

      // Initialize the logs array and query the graph for current gameID

        if(_gameStarted) {
          _logs = [`Game has started with ID: ${_game.id}`];

          if (_game.players && _game.players.length > 0) {
            _logs.push(`${_game.players.length} / ${_game.maxPlayers} Players have joined`);
            
            _game.players.forEach((player) => {
              _logs.push(`${player} Joined`);
            });          
          }

          setMaxPlayers(_game.maxPlayers);
          setEntryFee(BigNumber.from(_game.entryFee));
        } else if(!_gameStarted && _game.winner) {
          _logs = [
            `last game ended with ID: ${_game.id}`,
            `Winner is: ${_game.winner} 🏆`,
            `Wait for the host to start a new Game`,
          ];
          setWinner(_game.winner);
        }
        
        setLogs(_logs);
        setPlayers(_game.players);
        setGameStarted(_gameStarted);
        forceUpdate();

    } catch (err) {
      console.error(err);
    }
  };

  /**
   * getOwner: calls the contract to retrieve the owner
   */

const getOwner = async() => {
  try {
    const provider = await getProviderOrSigner();
    const randomGameContract = new Contract(RANDOM_GAME_CONTRACT_ADDRESS, RANDOM_GAME_ABI, provider);

    // call the owner function from the contract
     const _ownerAddress = await randomGameContract.owner();

    const signer = await getProviderOrSigner(true);
    // Get the address associated to the signer which is connected to  MetaMask
    const signerAddress = await signer.getAddress();

    if(signerAddress.toLowerCase() === _ownerAddress.toLowerCase()) {
      setIsOwner(true);
    }
  } catch (err) {
    console.error(err.message);    
  }
};


useEffect(() => {
  if(!walletConnected) {
    web3ModalRef.current = new Web3Modal({
      network: "mumbai",
      providerOptions: {},
      disableInjectedProvider: false,
    });

    connectWallet();
    getOwner();
    checkIfGameStarted();
    
    setInterval(() => {
      checkIfGameStarted(); 
    }, 3000);
  }
}, [walletConnected]);

const renderButton = () => {

  if(!walletConnected) {
    return (
      <button className={styles.button} onClick={connectWallet}> Connect Wallet 
      </button>
    );
  }

  if(loading) {
    return (
      <button className={styles.button}> Loading ...</button>
    )
  }

  if(gameStarted) {
    if(players.length === maxPlayers) {
      return (
        <button className={styles.button}> Picking Winner ... </button>
      )
    }

    return (
      <button className={styles.button} onClick={joinGame}>
        Join Game +
      </button>
    );
  }

  //start the Game

  if(isOwner && !gameStarted) {
    return (
      <div>
        <input 
        type="number"
        className={styles.input}
        onChange={(e) => {
              // The user will enter the value in ether, we will need to convert
              // it to WEI using parseEther
              setEntryFee(e.target.value >= 0 ? 
                                        utils.parseEther(e.target.value.toString()) 
                                        : zero);

        }}
        placeholder="Entry fee (ETH)"
        />

        <input 
        type = "number"
        className={styles.input}
        onChange={(e) => {
              // The user will enter the value for maximum players that can join the game
              setMaxPlayers(e.target.value ?? 0)          
        }}
        placeholder= "Max players"
        />
        <button className={styles.button} onClick={startGame}>
          Start Game ☑
        </button>
      </div>
    )
  }


}

  return (
    <div>
        <Head>
        <title>Random Raffle Game</title>
        <meta name="description" content="A random raffle built using chainlink" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        </Head>
        <div className={styles.main}>
          <div>
            <h1 className={styles.title}> AvantGarde's Raffle </h1>
            <div className= {styles.description}>
              A Game where a random wallet is rewarded the entire pool
            </div>
            {renderButton()}
            {logs && logs.map((log,index) => (
              <div className={styles.log} key={index}>
                {log}
              </div>
            ))}
          </div>
          <div >
            <img className={styles.image} src="./randomWinner.png" />
          </div>
        </div>
      <footer className={styles.footer}> Made with 💜 by AvantGard</footer>
    </div>
  )
}
