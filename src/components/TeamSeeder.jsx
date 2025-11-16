import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Users, ArrowRight } from "lucide-react";

export default function TeamSeeder({ tournament, teams, onComplete, onCancel }) {
  const [seededTeams, setSeededTeams] = useState(
    tournament.initial_teams?.map(id => teams.find(t => t.id === id)).filter(Boolean) || []
  );
  const [availableTeams, setAvailableTeams] = useState(
    teams.filter(t => 
      t.sport === tournament.sport && 
      (!tournament.division || t.division === tournament.division) &&
      !tournament.initial_teams?.includes(t.id)
    )
  );

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Moving from available to seeded
    if (source.droppableId === "available" && destination.droppableId === "seeded") {
      if (seededTeams.length >= tournament.num_teams) return;
      
      const newAvailable = Array.from(availableTeams);
      const [movedTeam] = newAvailable.splice(source.index, 1);
      const newSeeded = Array.from(seededTeams);
      newSeeded.splice(destination.index, 0, movedTeam);
      
      setAvailableTeams(newAvailable);
      setSeededTeams(newSeeded);
    }
    // Moving from seeded to available
    else if (source.droppableId === "seeded" && destination.droppableId === "available") {
      const newSeeded = Array.from(seededTeams);
      const [movedTeam] = newSeeded.splice(source.index, 1);
      const newAvailable = Array.from(availableTeams);
      newAvailable.splice(destination.index, 0, movedTeam);
      
      setSeededTeams(newSeeded);
      setAvailableTeams(newAvailable);
    }
    // Reordering within seeded
    else if (source.droppableId === "seeded" && destination.droppableId === "seeded") {
      const newSeeded = Array.from(seededTeams);
      const [movedTeam] = newSeeded.splice(source.index, 1);
      newSeeded.splice(destination.index, 0, movedTeam);
      setSeededTeams(newSeeded);
    }
    // Reordering within available
    else if (source.droppableId === "available" && destination.droppableId === "available") {
      const newAvailable = Array.from(availableTeams);
      const [movedTeam] = newAvailable.splice(source.index, 1);
      newAvailable.splice(destination.index, 0, movedTeam);
      setAvailableTeams(newAvailable);
    }
  };

  const handleComplete = () => {
    if (seededTeams.length !== tournament.num_teams) {
      alert(`Please seed exactly ${tournament.num_teams} teams`);
      return;
    }
    onComplete(seededTeams.map(t => t.id));
  };

  const TeamCard = ({ team, index, isDragging }) => (
    <div className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 ${
      isDragging ? 'shadow-2xl' : 'shadow-sm'
    } transition-all`}>
      <GripVertical className="w-5 h-5 text-gray-400" />
      {index !== undefined && (
        <Badge className="bg-blue-600 text-white font-black">#{index + 1}</Badge>
      )}
      <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700">
        <AvatarImage src={team.logo_url} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
          {team.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white truncate">{team.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{team.division || 'No Division'}</p>
      </div>
    </div>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6">
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-gray-900 dark:text-white">
              Seed Teams for {tournament.name}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Drag teams from available to seeded list. Order determines bracket positioning.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Seeded Teams */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Seeded Teams
                  </h3>
                  <Badge className={seededTeams.length === tournament.num_teams ? "bg-green-600" : "bg-orange-600"}>
                    {seededTeams.length} / {tournament.num_teams}
                  </Badge>
                </div>
                <Droppable droppableId="seeded">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] p-4 rounded-xl border-2 border-dashed ${
                        snapshot.isDraggingOver 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                      } transition-colors space-y-2`}
                    >
                      {seededTeams.map((team, index) => (
                        <Draggable key={team.id} draggableId={team.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TeamCard team={team} index={index} isDragging={snapshot.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {seededTeams.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                          <Users className="w-12 h-12 mb-2" />
                          <p className="text-sm font-semibold">Drag teams here</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Teams */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Available Teams
                  </h3>
                  <Badge variant="outline">{availableTeams.length} teams</Badge>
                </div>
                <Droppable droppableId="available">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] p-4 rounded-xl border-2 border-dashed ${
                        snapshot.isDraggingOver 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                      } transition-colors space-y-2`}
                    >
                      {availableTeams.map((team, index) => (
                        <Draggable key={team.id} draggableId={team.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TeamCard team={team} isDragging={snapshot.isDragging} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {availableTeams.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
                          <Users className="w-12 h-12 mb-2" />
                          <p className="text-sm font-semibold">No teams available</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={onCancel} className="font-bold">
                Cancel
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={seededTeams.length !== tournament.num_teams}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
              >
                Complete Seeding
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
}