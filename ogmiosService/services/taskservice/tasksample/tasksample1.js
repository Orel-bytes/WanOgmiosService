const BaseTask = require( "../BaseTask");
const serviceFramework = require("../../framework/ServiceFramework");
const taskSchedule = serviceFramework.getService("TaskServiceInterface","taskSchedule");

class tasksample1 extends BaseTask{
    constructor(){
        super()
        this.initTime = new Date().getTime();
        this.priority = 'fg';
    }

    work(){
        taskSchedule.setFinishSuccess(this);

    }


    async run(){
        var that = this;
        setTimeout(()=>{
            that.work();

        },2000)
        
    }
    setId(){

        this.Id =  'xxxxx';
    }

    getId(){
        
        return this.Id;
    }
    isRepeated(){
        return false;
    }

}

let task1 = new tasksample1();

taskSchedule.addTask(task1);
