
const BaseTask = require( "../BaseTask");
const serviceFramework = require("../../framework/ServiceFramework");
const taskSchedule = serviceFramework.getService["TaskServiceInterface"]["taskSchedule"];

class tasksample2 extends BaseTask{
    constructor(){
        super()
        this.initTime = new Date().getTime();
        this.priority = 'tg';
        
    }
    init(){
        console.log('get3000 -- in tasksample2 is init ...');
        this.setId();

        return true;
    }
    work(){
        taskSchedule.setFinishSuccess(this);
        this.setNextStartTime(5000);
        taskSchedule.addTask(this);

    }
    setNextStartTime(time){
        this.nextStartTime = new Date().getTime() + time;
    }
    async run(){
        
        var that = this;
        setTimeout(()=>{
            that.work();

        },2000)

    }

    setId(){

       this.Id = 10000;

    }
    getId(){
        return this.Id;
    }
    isRepeated(){
        return false;
    }

}

let task2 = new tasksample2();
task2.init();
taskSchedule.addTask(task2);