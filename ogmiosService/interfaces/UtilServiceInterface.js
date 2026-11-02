class UtilServiceInterface {
    constructor(){
        if (new.target === UtilServiceInterface) {
            throw new TypeError("Cannot construct Abstract class directly");
        }
    }

    /**
     * @param {*} hexStr
     * @memberof UtilServiceInterface
     */
    convertHexToAscii(hexStr){
        throw new Error("Abstract method!");
    }

    /**
     * @param {*} asciiStr
     * @memberof UtilServiceInterface
     */
    convertAsciiToHex(asciiStr){
        throw new Error("Abstract method!");
    }

    /**
     * @param {*} address
     * @memberof UtilServiceInterface
     */
    isValidAddress(address){
        throw new Error("Abstract method!");
    }

    /**
     * parse contract event
     *
     * @param {*} logs
     * @param {*} abi
     * @memberof UtilServiceInterface
     */
    parseLogs(logs, abi){
        throw new Error("Abstract method!");
    }

    /**
     * @param {*} scAbi
     * @param {*} scAddress
     * @memberof UtilServiceInterface
     */
    getContractInst(scAbi, scAddress){
        throw new Error("Abstract method!");
    }

    /**
     * @param {*} value
     * @memberof UtilServiceInterface
     */
    toHex(value){
        throw new Error("Abstract method!");
    }

    /**
     * @param {*} value
     * @memberof UtilServiceInterface
     */
    toDecimal(value){
        throw new Error("Abstract method!");
    }
    
    /**
     * @param {*} value
     * @memberof UtilServiceInterface
     */
    toBigNumber(value){
        throw new Error("Abstract method!");
    }

}

module.exports = UtilServiceInterface;