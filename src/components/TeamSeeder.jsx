import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Users, ArrowRight, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

    if (source.droppableId === "available" && destination.droppableId === "seeded") {
      if (seededTeams.length >= tournament.num_teams) return;
      
      const newAvailable = Array.from(availableTeams);
      const [movedTeam] = newAvailable.splice(source.index, 1);
      const newSeeded = Array.from(seededTeams);
      newSeeded.splice(destination.index, 0, movedTeam);
      
      setAvailableTeams(newAvailable);
      setSeededTeams(newSeeded);
    }
    else if (source.droppableId === "seeded" && destination.droppableId === "available") {
      const newSeeded = Array.from(seededTeams);
      const [movedTeam] = newSeeded.splice(source.index, 1);
      const newAvailable = Array.from(availableTeams);
      newAvailable.splice(destination.index, 0, movedTeam);
      
      setSeededTeams(newSeeded);
      setAvailableTeams(newAvailable);
    }
    else if (source.droppableId === "seeded" && destination.droppableId === "seeded") {
      const newSeeded = Array.from(seededTeams);
      const [movedTeam] = newSeeded.splice(source.index, 1);
      newSeeded.splice(destination.index, 0, movedTeam);
      setSeededTeams(newSeeded);
    }
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
    <div className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 ${
      isDragging 
        ? 'border-blue-500 shadow-2xl scale-105' 
        : 'border-gray-200 dark:border-gray-700 shadow-sm'
    } transition-all`}>
      <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
      {index !== undefined && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white font-black text-sm">{index + 1}</span>
        </div>
      )}
      <div className="w-1 h-10 bg-gray-900 dark:bg-white rounded flex-shrink-0"></div>
      <Avatar className="w-10 h-10 border-2 border-white dark:border-gray-700 flex-shrink-0">
        <AvatarImage src={team.logo_url} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-xs">
          {team.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white truncate uppercase text-sm">
          {team.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{team.division || 'No Division'}</p>
      </div>
    </div>
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6">
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-950/20">
          <CardHeader>
            <CardTitle className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Seed Teams for {tournament.name}
            </CardTitle>
            <Alert className="mt-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-300 font-medium">
                Drag teams to arrange the bracket seeding. Team #1 will face Team #{tournament.num_teams}, Team #2 will face Team #{tournament.num_teams - 1}, and so on.
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Seeded Teams - Bracket Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    Tournament Bracket Seeding
                  </h3>
                  <Badge className={`text-lg px-3 py-1 ${
                    seededTeams.length === tournament.num_teams 
                      ? "bg-green-600 text-white" 
                      : "bg-orange-600 text-white"
                  } font-black`}>
                    {seededTeams.length} / {tournament.num_teams}
                  </Badge>
                </div>
                <Droppable droppableId="seeded">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] p-4 rounded-xl border-2 border-dashed ${
                        snapshot.isDraggingOver 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                      } transition-colors space-y-3`}
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
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 py-20">
                          <Users className="w-16 h-16 mb-3" />
                          <p className="text-lg font-bold">Drag teams here to seed</p>
                          <p className="text-sm">Order determines bracket positioning</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Teams */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    Available Teams
                  </h3>
                  <Badge variant="outline" className="text-lg px-3 py-1 font-bold">
                    {availableTeams.length} teams
                  </Badge>
                </div>
                <Droppable droppableId="available">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[500px] p-4 rounded-xl border-2 border-dashed ${
                        snapshot.isDraggingOver 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                      } transition-colors space-y-3 overflow-y-auto max-h-[500px]`}
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
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 py-20">
                          <Users className="w-16 h-16 mb-3" />
                          <p className="text-lg font-bold">No teams available</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="font-bold text-lg px-6 py-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleComplete}
                disabled={seededTeams.length !== tournament.num_teams}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg px-8 py-6 shadow-xl"
              >
                Generate Bracket
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DragDropContext>
  );
}