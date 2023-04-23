
import React from 'react'

import initNoirWasm, { acir_read_bytes, compile } from "@noir-lang/noir_wasm";
import initialiseAztecBackend from "@noir-lang/aztec_backend";
// @ts-ignore
import { initialiseResolver } from "@noir-lang/noir-source-resolver";
// @ts-ignore
import { setup_generic_prover_and_verifier } from '@noir-lang/barretenberg';


export const compileCircuit = async () => {
  await initNoirWasm();

  return await fetch(new URL("../src/main.nr", import.meta.url))
  .then(r => r.text())
  .then(code => {
    initialiseResolver((id : any) => {
      return code;
    })
  })
  .then(() => {
    try {
      const compiled_noir = compile({});
      return compiled_noir;
    } catch (e) {
        console.log("Error while compiling:", e);
    }
  })
}

export const getAcir = async () => {
    const { circuit, abi } = await compileCircuit();
    await initialiseAztecBackend();

    // @ts-ignore
    let acir_bytes = new Uint8Array(Buffer.from(circuit, "hex"));
    return [ acir_read_bytes(acir_bytes), abi ]
}

export default function Page() {
  const myAsynFunction = async () => {
    console.log("Initializing...")
    const [acir, abi] = await getAcir()
    console.log("Generating prover and verifier...")
    let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
    console.log("Prover:")
    console.log(prover)
    console.log("Verifier:")
    console.log(verifier)
    
    console.log("Generating proof...")
    const worker = new Worker(new URL('../pages/worker.ts', import.meta.url));
    worker.onmessage = (e) => {
        if (e.data instanceof Error) {
          console.log("There was an error generating the proof")
        } else {
          console.log("The proof was generated")
        }
    }
    worker.postMessage({ acir, input: {x: 3, y: 4} });
    console.log("Finished async function")
  }

  return (
    <>
      <h1>Aztec Noir Minified Example</h1>
      <button onClick={myAsynFunction}>Calculate proof</button>
    </>  
  )
}
