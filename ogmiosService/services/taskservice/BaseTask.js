class BaseTask {
    constructor(){
        this.priority = 'bg';
        this.requestTime = new Date().getTime();
        this.nextStartTime = this.requestTime;
        this.Id  ='';
        this.executeTime = 0;
        this.status = 'wait';//wait,  running, finish-sus finish-fail
    }
    setExecuteTime(){
        this.executeTime = new Date().getTime();
    }
    getExecuteTime(){
        return this.executeTime;
    }

    getStatus(){
        return this.status;
    }
    setStatus(_status){
        this.status = _status;
    }
    setPriority(_priority){
        this.priority = _priority;
    }
    getPriority(){
        return this.priority;
    }
    setRequestTime(){
        this.requestTime =new Date().getTime();
    }
    getRequestTime(){
        return this.requestTime;
    }
    
//-------------- implement by child class
    getId(){}
    setId(){}
    isRepeated(){
        return true;
    }
    async run(){}

}

module.exports = BaseTask;