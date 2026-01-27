from enum import IntEnum
from typing import List, Optional
from fastapi import Body, FastAPI, HTTPException
from pydantic import BaseModel, Field

api = FastAPI()

class Priority(IntEnum):
    LOW = 3
    MEDIUM = 2
    HIGH = 1

class TodoBase(BaseModel):
    todo_name : str = Field(..., min_length=3, max_length=512, description='Name of the todo')
    todo_description : str = Field(..., description = 'Description of the todo')
    priority : Priority = Field(default=Priority.LOW, description = 'Priority of the todo object.')

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    todo_name : Optional[str] = Field(None, min_length=3, max_length=512, description='Name of the todo')
    todo_description : Optional[str] = Field(None, description = 'Description of the todo')
    priority : Optional[Priority] = Field(None, description = 'Priority of the todo object.')

class Todo(TodoBase):
    todo_id: int = Field(..., description='unique identifier of the todo')


all_todos = [
    Todo(todo_id=1, todo_name='Sports', todo_description='Go to the gym', priority=Priority.MEDIUM),
    Todo(todo_id=2, todo_name='Spleef', todo_description='avavavava', priority=Priority.HIGH),
    Todo(todo_id=3, todo_name='kekw', todo_description='awdawdawdym', priority=Priority.LOW),
    Todo(todo_id=4, todo_name='adadadad', todo_description='kk dubs', priority=Priority.MEDIUM)
]

# GET, POST, PUT, DELETE

@api.get('/')
def index():
    return {"message" : "Hello World"}

@api.get('/todos/{todo_id}', response_model=Todo)
def get_todo(todo_id: int):  #function parameters must have types, will default to string if not set.
    for todo in all_todos:
        if todo.todo_id == todo_id:
            return todo

@api.get('/todos', response_model=List[Todo])
def get_todos(first_n: int = None): #function parameters must have types, will default to string if not set.
    if first_n:
        return all_todos[:first_n]
    else: 
        return all_todos


@api.post('/todos', response_model=Todo)
def create_todo(todo: TodoCreate):
    new_todo_id = max(todo.todo_id for todo in all_todos) + 1

    new_todo = Todo(todo_id = new_todo_id, 
                    todo_name = todo.todo_name, 
                    todo_description = todo.todo_description,
                    priority = todo.priority)

    all_todos.append(new_todo)

    return new_todo

@api.put('/todos/{todo_id}', response_model=Todo)
def update_todo(todo_id: int, updated_todo: TodoUpdate = Body(default_factory=TodoUpdate)):
    for todo in all_todos:
        if todo.todo_id == todo_id:
            update_data = updated_todo.model_dump(exclude_none=True)
            for field, value in update_data.items():
                setattr(todo, field, value)
            return todo
    raise HTTPException(status_code=404, detail='Error, not found')


@api.delete('/todos/{todo_id}')
def delete_todo(todo_id: int):
    for index, todo in enumerate(all_todos):
        if todo['todo_id'] == todo_id:
            deleted_todo = all_todos.pop(index)
            return deleted_todo
    raise HTTPException(status_code=404, detail='Error, not found')
