import {
    Baby, Bike, Briefcase, Cake, Camera, Car, Dumbbell, Gamepad2, Gift, Glasses,
    GraduationCap, Heart, House, Laptop, Music, Palmtree, PawPrint, PiggyBank, Plane,
    Shirt, ShoppingCart, Siren, Smartphone, Star, Stethoscope, TreePine, Umbrella,
    User, Utensils, Wrench,
} from 'lucide-react';

// The curated goal icons. The key is what gets stored in savings.emoji.
export const GOAL_ICONS = [
    { key: 'savings', label: 'Savings', Icon: PiggyBank },
    { key: 'home', label: 'Home', Icon: House },
    { key: 'car', label: 'Car', Icon: Car },
    { key: 'plane', label: 'Travel', Icon: Plane },
    { key: 'vacation', label: 'Vacation', Icon: Palmtree },
    { key: 'gift', label: 'Gifts', Icon: Gift },
    { key: 'holiday', label: 'Holidays', Icon: TreePine },
    { key: 'celebration', label: 'Celebration', Icon: Cake },
    { key: 'pet', label: 'Pets', Icon: PawPrint },
    { key: 'heart', label: 'Heart', Icon: Heart },
    { key: 'medical', label: 'Medical', Icon: Stethoscope },
    { key: 'emergency', label: 'Emergency', Icon: Siren },
    { key: 'education', label: 'Education', Icon: GraduationCap },
    { key: 'work', label: 'Work', Icon: Briefcase },
    { key: 'laptop', label: 'Computer', Icon: Laptop },
    { key: 'phone', label: 'Phone', Icon: Smartphone },
    { key: 'camera', label: 'Camera', Icon: Camera },
    { key: 'game', label: 'Games', Icon: Gamepad2 },
    { key: 'music', label: 'Music', Icon: Music },
    { key: 'tools', label: 'Repairs', Icon: Wrench },
    { key: 'umbrella', label: 'Rainy day', Icon: Umbrella },
    { key: 'baby', label: 'Baby', Icon: Baby },
    { key: 'person', label: 'Person', Icon: User },
    { key: 'clothes', label: 'Clothes', Icon: Shirt },
    { key: 'glasses', label: 'Glasses', Icon: Glasses },
    { key: 'fitness', label: 'Fitness', Icon: Dumbbell },
    { key: 'bike', label: 'Bike', Icon: Bike },
    { key: 'dining', label: 'Dining', Icon: Utensils },
    { key: 'groceries', label: 'Groceries', Icon: ShoppingCart },
    { key: 'star', label: 'Special', Icon: Star },
];

export const DEFAULT_ICON_KEY = 'savings';

const BY_KEY = Object.fromEntries(GOAL_ICONS.map((icon) => [icon.key, icon]));

// Goals created before the icon set stored an emoji shortcode (":dog:").
// Map each one the old picker could produce to the closest icon.
const EMOJI_TO_ICON = {
    ':heart:': 'heart', ':moneybag:': 'savings', ':red_car:': 'car', ':taxi:': 'car',
    ':bus:': 'car', ':train:': 'car', ':house:': 'home', ':airplane:': 'plane',
    ':rocket:': 'plane', ':gift:': 'gift', ':dog:': 'pet', ':cat:': 'pet', ':baby:': 'baby',
    ':mortar_board:': 'education', ':books:': 'education', ':briefcase:': 'work',
    ':computer:': 'laptop', ':phone:': 'phone', ':camera:': 'camera', ':game_die:': 'game',
    ':musical_note:': 'music', ':palm_tree:': 'vacation', ':sunny:': 'vacation',
    ':umbrella:': 'umbrella', ':snowflake:': 'umbrella', ':rainbow:': 'umbrella',
    ':star:': 'star', ':sparkles:': 'star', ':dizzy:': 'star', ':gem:': 'star',
    ':trophy:': 'star', ':medal_sports:': 'star', ':crown:': 'star', ':zap:': 'star',
    ':fire:': 'emergency', ':rotating_light:': 'emergency', ':bike:': 'bike',
    ':strawberry:': 'groceries', ':man_cook:': 'dining', ':herb:': 'holiday',
    ':wedding:': 'celebration', ':eyeglasses:': 'glasses', ':woman:': 'person',
    ':man:': 'person', ':christmas_tree:': 'holiday', ':tooth:': 'medical',
};

export function resolveIcon(stored) {
    if (stored && BY_KEY[stored]) return BY_KEY[stored];
    const mapped = stored && EMOJI_TO_ICON[stored];
    return BY_KEY[mapped || DEFAULT_ICON_KEY];
}
