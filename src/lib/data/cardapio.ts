export interface Product {
	id: string;
	name: string;
	price: number;
	category: string;
	active: boolean;
}

export const defaultProducts: Product[] = [
	// Porções
	{ id: 'p1', name: 'Batata Frita com Bacon e Catupiry/Cheddar', price: 27.9, category: 'Porções', active: true },
	{ id: 'p2', name: 'Batata Frita Individual', price: 19.9, category: 'Porções', active: true },
	{ id: 'p3', name: 'Anéis de Cebola (12 un)', price: 27.9, category: 'Porções', active: true },
	{ id: 'p4', name: 'Nuggets com Queijo (10 un)', price: 27.9, category: 'Porções', active: true },

	// Milkshake
	{ id: 'm1', name: 'Milkshake Ovomaltine', price: 26.9, category: 'Milkshake', active: true },
	{ id: 'm2', name: 'Milkshake Pacoquinha', price: 26.9, category: 'Milkshake', active: true },
	{ id: 'm3', name: 'Milkshake Morango', price: 26.9, category: 'Milkshake', active: true },

	// Lanches
	{ id: 'l1', name: 'Spicy Burguer', price: 35.9, category: 'Lanches', active: true },
	{ id: 'l2', name: 'Tuki Burguer', price: 28.9, category: 'Lanches', active: true },
	{ id: 'l3', name: 'Tuki Kids', price: 24.9, category: 'Lanches', active: true },
	{ id: 'l4', name: 'Catan Burguer', price: 36.9, category: 'Lanches', active: true },
	{ id: 'l5', name: 'Karuba Burguer', price: 36.9, category: 'Lanches', active: true },
	{ id: 'l6', name: 'Ubongo Burguer', price: 39.9, category: 'Lanches', active: true },
	{ id: 'l7', name: 'Odin Burguer', price: 39.9, category: 'Lanches', active: true },
	{ id: 'l8', name: 'Clank Burguer', price: 36.9, category: 'Lanches', active: true },
	{ id: 'l9', name: 'Dobble Burguer', price: 36.9, category: 'Lanches', active: true },
	{ id: 'l10', name: 'Verdant', price: 39.9, category: 'Lanches', active: true },

	// Combos
	{ id: 'c1', name: 'Combo Odin', price: 54.8, category: 'Combos', active: true },
	{ id: 'c2', name: 'Combo Dobble', price: 51.8, category: 'Combos', active: true },
	{ id: 'c3', name: 'Combo Tuki Kids', price: 38.9, category: 'Combos', active: true },
	{ id: 'c4', name: 'Combo Karuba', price: 51.8, category: 'Combos', active: true },
	{ id: 'c5', name: 'Combo Verdant', price: 54.8, category: 'Combos', active: true },
	{ id: 'c6', name: 'Combo Clank', price: 51.8, category: 'Combos', active: true },
	{ id: 'c7', name: 'Combo Ubongo', price: 54.8, category: 'Combos', active: true },
	{ id: 'c8', name: 'Combo Catan', price: 51.8, category: 'Combos', active: true },
	{ id: 'c9', name: 'Combo Tuki', price: 43.8, category: 'Combos', active: true },
	{ id: 'c10', name: 'Combo Spicy Burguer', price: 51.8, category: 'Combos', active: true },

	// Drinks Alcoólicos
	{ id: 'd1', name: 'Marrakesh', price: 22.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd2', name: 'Rancho Elétrico', price: 16.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd3', name: 'Love Letter', price: 22.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd4', name: 'Vale dos Monstros', price: 24.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd5', name: 'Rum & Bones', price: 24.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd6', name: 'Poção de HP', price: 24.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd7', name: 'Poção de Estamina', price: 24.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd8', name: 'Takenoko', price: 23.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd9', name: 'Ouch', price: 18.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd10', name: 'Dive', price: 25.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd11', name: 'Skullmule', price: 28.9, category: 'Drinks Alcoólicos', active: true },
	{ id: 'd12', name: 'Nosferatu', price: 24.9, category: 'Drinks Alcoólicos', active: true },

	// Gins com Especiarias
	{ id: 'g1', name: 'Gin Blueberry', price: 28.9, category: 'Gins com Especiarias', active: true },
	{ id: 'g2', name: 'Gin Morango com Pimenta', price: 28.9, category: 'Gins com Especiarias', active: true },
	{ id: 'g3', name: 'Gin Tropical Especiarias', price: 28.9, category: 'Gins com Especiarias', active: true },

	// Drinks Não Alcoólicos
	{ id: 'n1', name: 'Blood Rage sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n2', name: 'Piratas Kings Gold sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n3', name: 'Dive sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n4', name: 'Love Letter sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n5', name: 'Marrakesh sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n6', name: 'Rum And Bones sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n7', name: 'Poção HP sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },
	{ id: 'n8', name: 'Poção Mana sem Álcool', price: 22.9, category: 'Drinks Não Alcoólicos', active: true },

	// Bebidas
	{ id: 'b1', name: 'Chopp Brahma 380ml', price: 11.9, category: 'Bebidas', active: true },
	{ id: 'b2', name: 'Long Neck Heineken', price: 9.9, category: 'Bebidas', active: true },
	{ id: 'b3', name: 'Água Mineral sem Gás', price: 5.0, category: 'Bebidas', active: true },
	{ id: 'b4', name: 'Água Mineral com Gás', price: 5.0, category: 'Bebidas', active: true },
	{ id: 'b5', name: 'Refrigerante Lata 350ml', price: 6.5, category: 'Bebidas', active: true },
	{ id: 'b6', name: 'Suco Morango 380ml', price: 12.0, category: 'Bebidas', active: true },
	{ id: 'b7', name: 'Suco Laranja 380ml', price: 13.0, category: 'Bebidas', active: true },
	{ id: 'b8', name: 'Suco Maracujá 380ml', price: 14.0, category: 'Bebidas', active: true },
	{ id: 'b9', name: 'Suco Frutas Vermelhas 380ml', price: 15.0, category: 'Bebidas', active: true },
	{ id: 'b10', name: 'Suco Abacaxi 380ml', price: 14.0, category: 'Bebidas', active: true },
	{ id: 'b11', name: 'Suco Abacaxi com Hortelã 380ml', price: 14.0, category: 'Bebidas', active: true },
	{ id: 'b12', name: 'Budweiser Long Neck', price: 8.9, category: 'Bebidas', active: true },
];
