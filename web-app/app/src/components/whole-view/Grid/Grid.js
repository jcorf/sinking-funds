import React, {useEffect, useState} from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import './Grid.css';
import Infocard from "../InfoCard/InfoCard"
import AddCard from "../AddCard/AddCard"
import {getAllData} from "../../utils/api";

function SortableItem({card}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({id: card.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      className="grid-item" 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
    >
      <Infocard 
        id={card.id} 
        category={card.category} 
        saved={card.saved} 
        icon={card.icon}
        goal={card.goal} 
        toSave={card.calculated_to_save} 
        goalDate={card.goal_date}
      />
    </div>
  );
}

const Grid = () => {
    const [cards, setCards] = useState([]);

    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo(0, 0);
        
        fetch('http://127.0.0.1:5000/get_data')
            .then(response => response.json())
            .then(data => {
                setCards(data['data'])
            })
            .catch(error => console.error('Error fetching data:', error));
    }, []);

    async function updateGridCards() {
        try {
            const data = await getAllData();
            setCards(data['data']);
        } catch (error) {
            console.error("Error fetching data: ", error);
        }
    }

    function handleDragEnd(event) {
      const {active, over} = event;

      if (active.id !== over.id) {
        setCards((items) => {
          const oldIndex = items.findIndex(item => item.id === active.id);
          const newIndex = items.findIndex(item => item.id === over.id);

          return arrayMove(items, oldIndex, newIndex);
        });
      }
    }

    return (
        <div className="grid">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={cards.map(card => card.id)} strategy={rectSortingStrategy}>
                <div className="grid-container">
                    {cards.map((card) => (
                        <SortableItem key={card.id} card={card} />
                    ))}
                    <div className="grid-item add-card-item">
                        <AddCard updateGridCards={updateGridCards}/>
                    </div>
                </div>
              </SortableContext>
            </DndContext>
        </div>
    );
};


export default Grid;