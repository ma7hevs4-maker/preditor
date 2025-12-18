import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamStructure {
  id: string;
  base_id: string;
  name: string;
  is_default: boolean;
  teams_hour_0: number;
  teams_hour_1: number;
  teams_hour_2: number;
  teams_hour_3: number;
  teams_hour_4: number;
  teams_hour_5: number;
  teams_hour_6: number;
  teams_hour_7: number;
  teams_hour_8: number;
  teams_hour_9: number;
  teams_hour_10: number;
  teams_hour_11: number;
  teams_hour_12: number;
  teams_hour_13: number;
  teams_hour_14: number;
  teams_hour_15: number;
  teams_hour_16: number;
  teams_hour_17: number;
  teams_hour_18: number;
  teams_hour_19: number;
  teams_hour_20: number;
  teams_hour_21: number;
  teams_hour_22: number;
  teams_hour_23: number;
  loss_teams_hour_0: number;
  loss_teams_hour_1: number;
  loss_teams_hour_2: number;
  loss_teams_hour_3: number;
  loss_teams_hour_4: number;
  loss_teams_hour_5: number;
  loss_teams_hour_6: number;
  loss_teams_hour_7: number;
  loss_teams_hour_8: number;
  loss_teams_hour_9: number;
  loss_teams_hour_10: number;
  loss_teams_hour_11: number;
  loss_teams_hour_12: number;
  loss_teams_hour_13: number;
  loss_teams_hour_14: number;
  loss_teams_hour_15: number;
  loss_teams_hour_16: number;
  loss_teams_hour_17: number;
  loss_teams_hour_18: number;
  loss_teams_hour_19: number;
  loss_teams_hour_20: number;
  loss_teams_hour_21: number;
  loss_teams_hour_22: number;
  loss_teams_hour_23: number;
}

export const useTeamStructures = (baseId: string | null) => {
  return useQuery({
    queryKey: ["team_structures", baseId],
    queryFn: async () => {
      if (!baseId) return [];
      
      const { data, error } = await supabase
        .from("team_structures")
        .select("*")
        .eq("base_id", baseId)
        .order("name");
      
      if (error) throw error;
      return data as TeamStructure[];
    },
    enabled: !!baseId,
  });
};

export const useAddTeamStructure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (structure: Omit<TeamStructure, "id">) => {
      const { data, error } = await supabase
        .from("team_structures")
        .insert([structure])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_structures"] });
    },
  });
};

export const useUpdateTeamStructure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TeamStructure> & { id: string }) => {
      const { error } = await supabase
        .from("team_structures")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_structures"] });
    },
  });
};

export const useDeleteTeamStructure = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_structures")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_structures"] });
    },
  });
};

// Helper to convert structure to array format
export const structureToTeamsArray = (structure: TeamStructure): number[] => {
  return [
    structure.teams_hour_0, structure.teams_hour_1, structure.teams_hour_2, structure.teams_hour_3,
    structure.teams_hour_4, structure.teams_hour_5, structure.teams_hour_6, structure.teams_hour_7,
    structure.teams_hour_8, structure.teams_hour_9, structure.teams_hour_10, structure.teams_hour_11,
    structure.teams_hour_12, structure.teams_hour_13, structure.teams_hour_14, structure.teams_hour_15,
    structure.teams_hour_16, structure.teams_hour_17, structure.teams_hour_18, structure.teams_hour_19,
    structure.teams_hour_20, structure.teams_hour_21, structure.teams_hour_22, structure.teams_hour_23,
  ];
};

export const structureToLossTeamsArray = (structure: TeamStructure): number[] => {
  return [
    structure.loss_teams_hour_0, structure.loss_teams_hour_1, structure.loss_teams_hour_2, structure.loss_teams_hour_3,
    structure.loss_teams_hour_4, structure.loss_teams_hour_5, structure.loss_teams_hour_6, structure.loss_teams_hour_7,
    structure.loss_teams_hour_8, structure.loss_teams_hour_9, structure.loss_teams_hour_10, structure.loss_teams_hour_11,
    structure.loss_teams_hour_12, structure.loss_teams_hour_13, structure.loss_teams_hour_14, structure.loss_teams_hour_15,
    structure.loss_teams_hour_16, structure.loss_teams_hour_17, structure.loss_teams_hour_18, structure.loss_teams_hour_19,
    structure.loss_teams_hour_20, structure.loss_teams_hour_21, structure.loss_teams_hour_22, structure.loss_teams_hour_23,
  ];
};

// Helper to convert array to structure object format
export const teamsArrayToStructure = (teams: number[], lossTeams: number[]): Partial<TeamStructure> => {
  return {
    teams_hour_0: teams[0] || 0, teams_hour_1: teams[1] || 0, teams_hour_2: teams[2] || 0, teams_hour_3: teams[3] || 0,
    teams_hour_4: teams[4] || 0, teams_hour_5: teams[5] || 0, teams_hour_6: teams[6] || 0, teams_hour_7: teams[7] || 0,
    teams_hour_8: teams[8] || 0, teams_hour_9: teams[9] || 0, teams_hour_10: teams[10] || 0, teams_hour_11: teams[11] || 0,
    teams_hour_12: teams[12] || 0, teams_hour_13: teams[13] || 0, teams_hour_14: teams[14] || 0, teams_hour_15: teams[15] || 0,
    teams_hour_16: teams[16] || 0, teams_hour_17: teams[17] || 0, teams_hour_18: teams[18] || 0, teams_hour_19: teams[19] || 0,
    teams_hour_20: teams[20] || 0, teams_hour_21: teams[21] || 0, teams_hour_22: teams[22] || 0, teams_hour_23: teams[23] || 0,
    loss_teams_hour_0: lossTeams[0] || 0, loss_teams_hour_1: lossTeams[1] || 0, loss_teams_hour_2: lossTeams[2] || 0, loss_teams_hour_3: lossTeams[3] || 0,
    loss_teams_hour_4: lossTeams[4] || 0, loss_teams_hour_5: lossTeams[5] || 0, loss_teams_hour_6: lossTeams[6] || 0, loss_teams_hour_7: lossTeams[7] || 0,
    loss_teams_hour_8: lossTeams[8] || 0, loss_teams_hour_9: lossTeams[9] || 0, loss_teams_hour_10: lossTeams[10] || 0, loss_teams_hour_11: lossTeams[11] || 0,
    loss_teams_hour_12: lossTeams[12] || 0, loss_teams_hour_13: lossTeams[13] || 0, loss_teams_hour_14: lossTeams[14] || 0, loss_teams_hour_15: lossTeams[15] || 0,
    loss_teams_hour_16: lossTeams[16] || 0, loss_teams_hour_17: lossTeams[17] || 0, loss_teams_hour_18: lossTeams[18] || 0, loss_teams_hour_19: lossTeams[19] || 0,
    loss_teams_hour_20: lossTeams[20] || 0, loss_teams_hour_21: lossTeams[21] || 0, loss_teams_hour_22: lossTeams[22] || 0, loss_teams_hour_23: lossTeams[23] || 0,
  };
};
