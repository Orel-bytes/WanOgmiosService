const TaskServiceInterface =require('../../interfaces/TaskServiceInterface');
const  TaskQueue =require( './TaskQueue');
class TaskSchedule extends  TaskServiceInterface{
    constructor(){
        super();
        this.serviceName="taskSchedule";
        this.taskQueue = new TaskQueue();
        setInterval(this.taskCheckHandler.bind(this),2000);
    }

    taskCheckHandler(){


        //fg
        let taskFgs = this.taskQueue.selectFgTask();
        if(taskFgs){
            for(let i = 0;i< taskFgs.length;i++){
                taskFgs[i].run();
            }
        }
        //bg
        let taskBg = this.taskQueue.selectBgTask();
        if(taskBg){
            taskBg.run();
        }

        //tg-- can run multiple
        let taskTgs = this.taskQueue.selectTgTask();
        if(taskTgs){
            for(let i = 0;i< taskTgs.length;i++){
                taskTgs[i].run();
            }

        }
    }
    addTask(_concreteTask){
        this.taskQueue.addTask(_concreteTask);
    }
    setFinishSuccess(_concreteTask){
        _concreteTask.setStatus('finish-sus');
        this.taskQueue.setTaskFinish(_concreteTask);

    }
    setFinishFail(_concreteTask) {
        _concreteTask.setStatus('finish-fail');
        this.taskQueue.setTaskFinish(_concreteTask);

    }
}




module.exports = TaskSchedule;

