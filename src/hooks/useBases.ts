import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Base {
  id: string;
  name: string;
  lat: number;
  lon: number;
  timezone: string;
  active: boolean;
}

export const useBases = () => {
  return useQuery({
    queryKey: ["bases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bases")
        .select("*")
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      return data as Base[];
    },
  });
};

export const useAddBase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (base: Omit<Base, "id" | "active">) => {
      const { data, error } = await supabase
        .from("bases")
        .insert([base])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bases"] });
    },
  });
};
