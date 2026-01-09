-- Clear existing polo data and insert per-base data
DELETE FROM public.contingency_levels;

-- Insert contingency levels for each base directly
-- Campos
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Campos', 0, 188, 190, 283, 285, 350, 353, 493, 495);

-- Lagos bases (Araruama, Cabo Frio)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Araruama', 0, 225, 228, 263, 265, 363, 365, 638, 640),
('Cabo Frio', 0, 225, 228, 263, 265, 363, 365, 638, 640);

-- Macaé
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Macaé', 0, 130, 133, 200, 203, 293, 295, 400, 403);

-- Noroeste bases (Itaperuna, Pádua, Cantagalo)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Itaperuna', 0, 145, 148, 158, 160, 270, 273, 403, 405),
('Pádua', 0, 145, 148, 158, 160, 270, 273, 403, 405),
('Cantagalo', 0, 145, 148, 158, 160, 270, 273, 403, 405);

-- Magé
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Magé', 0, 158, 160, 205, 208, 265, 268, 425, 428);

-- Niterói bases (Niterói, Maricá)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Niterói', 0, 203, 205, 350, 353, 430, 433, 835, 838),
('Maricá', 0, 203, 205, 350, 353, 430, 433, 835, 838);

-- São Gonçalo
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('São Gonçalo', 0, 188, 190, 430, 433, 575, 578, 703, 705);

-- Serrana bases (Petrópolis, Teresópolis)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Petrópolis', 0, 158, 160, 243, 245, 338, 340, 545, 548),
('Teresópolis', 0, 158, 160, 243, 245, 338, 340, 545, 548);

-- Sul bases (Angra dos Reis, Resende)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Angra dos Reis', 0, 140, 143, 270, 273, 400, 403, 558, 560),
('Resende', 0, 140, 143, 270, 273, 400, 403, 558, 560);

-- Enel Rio (total)
INSERT INTO public.contingency_levels (polo, normal_min, normal_max, nivel1_min, nivel1_max, nivel2_min, nivel2_max, crise_min, crise_max, extremo_min) VALUES
('Enel Rio', 0, 1533, 1555, 2400, 2423, 3283, 3285, 4998, 5020);

-- Rename column from 'polo' to 'base_name' for clarity
ALTER TABLE public.contingency_levels RENAME COLUMN polo TO base_name;