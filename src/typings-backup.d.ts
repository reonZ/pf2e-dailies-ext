type DailyFunction<A extends BaseDailyValueArgs, V extends any> = (args: A) => V | Promise<V>
type DailyValue<A extends BaseDailyValueArgs, V extends any> = V | DailyFunction<A, V>

type DailyLabel<T extends DailyGenerics> = DailyValue<DailyValueArgs<T>, string>

type BaseDailyConditionFunction<T extends DailyGenerics = DailyGenerics> = DailyFunction<BaseDailyValueArgs<T>, boolean>
type DailyConditional<T extends DailyGenerics, A extends DailyValueArgs<T> = DailyValueArgs<T>> = {
    childPredicate?: RawPredicate
    condition?: DailyFunction<A, boolean>
}

type DailyChildName = string
type DailyRowName = string
type DailyGenerics = [DailyRowName, DailyCustom, DailyChildName]

type Daily<T extends DailyGenerics = DailyGenerics> = {
    /**
     * Unique key.
     */
    key: string
    /**
     * Root item that will decide if this daily is used or not.
     */
    item: {
        /**
         * UUID of the item.
         */
        uuid: ItemUUID
        /**
         * If return false, the item and therefore the entire daily will be skipped.
         */
        condition?: BaseDailyConditionFunction<T>
    }
    /**
     * Label used as the group title if more than one row are displayed, otherwise it will be used as the row label.
     *
     * If left empty, the root item name will be used instead.
     *
     * Can be a string or a function returning a string.
     */
    label?: DailyLabel<T>
    /**
     * List of items that will also be used in this daily.
     */
    children?: DailyChild<T>[]
    /**
     * List of row definition that will be used in the preparation interface.
     */
    rows: DailyRow<T>[]
    /**
     * This function is run just after checking the different items and before the parsing of the rows.
     *
     * It is usefull when complex data gathering has to be done.
     *
     * It should return a custom object and will be passed to all the functions of the daily.
     */
    prepare?: (args: DailyPrepareArgs<T>) => T[1] | Promise<T[1]>
    /**
     * This function is called after the user made all their choices and is used to create/update all
     * the different items and set up the different chat messages lines.
     */
    process: DailyProcessFunction<T>
    /**
     * This function is used during rest if this daily needs to do any particular extra cleaning that the module doesn't handle.
     */
    rest?: (args: DailyRestArgs) => void | Promise<void>
}

type DailyChild<T extends DailyGenerics> = {
    /**
     * A string representing this child (must be unique among all children of this daily)
     */
    slug: T[2]
    /**
     * UUID of the item.
     */
    uuid: ItemUUID
    /**
     * If return false, the item will be skipped.
     */
    condition?: BaseDailyConditionFunction<T>
}

type ReturnedDaily<T extends DailyGenerics = DailyGenerics> = Omit<Daily, 'item' | 'children'> & {
    item: ItemPF2e
    children?: (DailyChild<T> & {
        item?: ItemPF2e
    })[]
}

type DailyTemplate = { label: string; rows: DailyRowTemplate[] }

type DailyProcessFunction<T extends DailyGenerics = DailyGenerics> = DailyFunction<DailyProcessFunctionArgs<T>, void>

type DailyFeatFilter = Omit<InitialFeatFilters, 'level'> & {
    /**
     * Can use the shortcuts 'level' and 'half' to respectively use the actor's level and half its value.
     *
     * If single value is provided instead of the normal {min: number, max: number}, that value will be used as the 'max' and 'min' will be 0.
     */
    level?: DailySimplifiableValue | { min?: DailySimplifiableValue; max?: DailySimplifiableValue }
}

type DailySpellFilter = Omit<InitialSpellFilters, 'level'> & {
    /**
     * Can use the shortcuts 'level' and 'half' to respectively use the actor's level and half its value.
     *
     * If single value is provided instead of the normal list, that value will be used as the to create a range of levels between 0 and the value.
     */
    level?: DailySimplifiableValue | number[]
}

type SavedCustomDaily = { key: string; code: string }

type BaseDailyValueArgs<T extends DailyGenerics = DailyGenerics> = {
    actor: CharacterPF2e
    item: ItemPF2e
    utils: DailyUtils
}

type DailyValueArgs<T extends DailyGenerics = DailyGenerics> = BaseDailyValueArgs<T> & {
    /**
     * Object of children items or undefined if the item was not found on the actor (or didn't pass the condition)
     *
     * children = {
     *   child1Slug = ItemPF2e | undefined
     *   child2Slug = ItemPF2e | undefined
     *   child3Slug = ItemPF2e | undefined
     * }
     */
    children: Record<T[2], ItemPF2e | undefined>
    /**
     * The custom object that was returned from the 'prepare' function or an empty object.
     */
    custom: T[1]
}

type DailyPrepareArgs<T extends DailyGenerics = DailyGenerics> = Omit<DailyValueArgs<T>, 'custom'>

type DailyProcessFunctionArgs<T extends DailyGenerics = DailyGenerics> = DailyValueArgs<T> & {
    /**
     * An object that contains the different row fields data organized by rows
     *
     * fields = {
     *   row1Slug: {...},
     *   row2Slug: {...},
     *   row3Slug: {...},
     * }
     */
    fields: DailyRowFields<T>
    /**
     * The message object used to create the different chat message lines. You can add message groups or add a message to a group.
     *
     * A list of already existing message groups is available and have their own grouping section:
     * * languages: groups all acquired languages
     * * skills: groups the skills that gained the trained proficiency rank
     * * resistances: groups gained resistances
     * * feats: groups gained feats
     * * spells: groups gained spells
     * * scrolls: groups gained spell scrolls
     */
    messages: DailyMessagesObject
    /**
     * A convenient function to create new item for this actor.
     *
     * The reason this function exists is to compile all the item creations into a single server call and actor update.
     */
    addItem: DailyProcessAddFunction
    /**
     * A convenient function to update an existing item on this actor.
     *
     * The reason this function exists is to compile all the item updates into a single server call and actor update.
     */
    updateItem: DailyProcessUpdateFunction
    /**
     * A convenient function to add a new rule on an item present on the actor.
     *
     * if 'parent' is not provided, the root item of the daily will be used instead.
     *
     * The reason this function exists is to compile all the rule additions that could possibly happen on the same item
     * into a single bundling operation that will then be added to the same actor update as would the 'updateItem' function
     * (so only one single server call and actor update is made).
     */
    addRule: DailyProcessRulesFunction
    /**
     * A convenient function to add a new feat to the actor. The feat will be displayed on cascade with the 'parent' item if the 'parent' is also a feat.
     *
     * if 'parent' is not provided, the root item of the daily will be used instead.
     *
     * The reason this function exists is to compile all the item creations into a single server call and actor update.
     * It will also automatically takes care of the cascading.
     */
    addFeat: DailyProcessFeatFunction
    /**
     * A convenient function to add a new spell to the actor. The spell will be heightened the the 'level' if provided.
     *
     * Because spells cannot be just there, all spells added with this function will be grouped into a new temporary spellcasting entry.
     *
     * The reason this function exists is to compile all the item creations into a single server call and actor update.
     * It will also make sure this spell is added to a spellcasting entry (which normally would requires some extra tedious work).
     */
    addSpell: DailyProcessSpellFunction
}

type DailyRestArgs = {
    /**
     * The item that is currently checked.
     */
    item: ItemPF2e
    /**
     * The sourceId that was found on the item and is the UUID of one of this daily's items.
     */
    sourceId: ItemUUID
    /**
     * A convenient function to update an existing item on this actor.
     *
     * The reason this function exists is to compile all the item updates into a single server call and actor update.
     */
    updateItem: DailyProcessUpdateFunction
}

type DailyMessage = { uuid?: ItemUUID; selected?: string; label?: string; random?: boolean }

type DailyMessageGroups = Record<string, DailyMessageGroup>
type DailyMessageGroup = {
    label?: string
    order: number
    messages: DailyMessage[]
}

/**
 * The message object used to create the different chat message lines. You can add message groups or add a message to a group.
 *
 * A list of already existing message groups is available and have their own grouping section:
 * * languages: groups all acquired languages
 * * skills: groups the skills that gained the trained proficiency rank
 * * resistances: groups gained resistances
 * * feats: groups gained feats
 * * spells: groups gained spells
 * * scrolls: groups gained spell scrolls
 */
type DailyMessagesObject = {
    /**
     * Adds a message to a group. The message will be different depending on the options provided.
     * * uuid: will create an item link as first element of the message line
     * * label: if no 'uuid', the label will be used as the first element of the message line, otherwise, it will replace the item link text inside the link
     * * selected: will be used as the second element in the chat message, after either the link or the label
     * * random: if true, adds a little die icon showing that this was randomly rolled
     */
    add: (group: string, options: DailyMessage) => void
    /**
     * Adds a new group message if the 'group' value does not already exists.
     *
     * 'order' is a number that will sort out the message groups (the higher the value, the earlier this group will appear in the chat message).
     *
     * 'label' is the text that will be displayed to inform what this group is all about (i.e. 'Trained in the following skills:')
     */
    addGroup: (group: string, order?: number, label?: string) => void
}

type EmbeddedDocumentUpdateData<T> = { _id: string } & T

/**
 * A convenient function to create new item for this actor.
 *
 * The reason this function exists is to compile all the item creations into a single server call and actor update.
 */
type DailyProcessAddFunction = (source: DeepPartial<BaseItemSourcePF2e>) => void
/**
 * A convenient function to update an existing item on this actor.
 *
 * The reason this function exists is to compile all the item updates into a single server call and actor update.
 */
type DailyProcessUpdateFunction = (source: EmbeddedDocumentUpdateData<ItemPF2e>) => void
/**
 * A convenient function to add a new rule on an item present on the actor.
 *
 * if 'parent' is not provided, the root item of the daily will be used instead.
 *
 * The reason this function exists is to compile all the rule additions that could possibly happen on the same item
 * into a single bundling operation that will then be added to the same actor update as would the 'updateItem' function
 * (so only one single server call and actor update is made).
 */
type DailyProcessRulesFunction = (source: DailyRuleSource, parent?: ItemPF2e) => void
/**
 * A convenient function to add a new feat to the actor. The feat will be displayed on cascade with the 'parent' item if the 'parent' is also a feat.
 *
 * if 'parent' is not provided, the root item of the daily will be used instead.
 *
 * The reason this function exists is to compile all the item creations into a single server call and actor update.
 * It will also automatically takes care of the cascading.
 */
type DailyProcessFeatFunction = (source: FeatSource, parent?: ItemPF2e) => void
/**
 * A convenient function to add a new spell to the actor. The spell will be heightened the the 'level' if provided.
 *
 * Because spells cannot be just there, all spells added with this function will be grouped into a new temporary spellcasting entry.
 *
 * The reason this function exists is to compile all the item creations into a single server call and actor update.
 * It will also make sure this spell is added to a spellcasting entry (which normally would requires some extra tedious work).
 */
type DailyProcessSpellFunction = (source: SpellSource, level?: number) => void

type DailyRowType = 'combo' | 'select' | 'input' | 'random' | 'alert' | 'drop'

type DailyRowDropFunctionReturnedValue = boolean | { error: string; data?: Record<string, string | number | boolean> }
type DailyRowDropFunction<T extends DailyGenerics = DailyGenerics, I extends ItemPF2e = ItemPF2e> = (
    item: I,
    args: DailyValueArgs<T>
) => DailyRowDropFunctionReturnedValue | Promise<DailyRowDropFunctionReturnedValue>

type DailyRowDropFilter<T extends DailyGenerics, S extends string, F extends BaseInitialFilters, I extends ItemPF2e> = {
    /**
     * Type of filter, it should be either 'feat' or 'spell'.
     */
    type: S
    /**
     * The search filter that will be used in the compendium browser and when the user drop an item.
     *
     * It can be a function returning a filter.
     */
    search: DailyValue<DailyValueArgs<T>, F>
    /**
     * Rhis function is called during item drop and is used in case the browser filters are not enough for item validation.
     */
    drop?: DailyRowDropFunction<T, I>
}

type DailyRowDropFeat<T extends DailyGenerics = DailyGenerics> = {
    /**
     * Filter object used both for the compendium browser search and when the user actually drop an item.
     */
    filter: DailyRowDropFilter<T, 'feat', DailyFeatFilter, FeatPF2e>
}

type DailyRowDropSpell<T extends DailyGenerics = DailyGenerics> = {
    /**
     * Filter object used both for the compendium browser search and when the user actually drop an item.
     */
    filter: DailyRowDropFilter<T, 'spell', DailySpellFilter, SpellPF2e>
}

type DailyRowDropParsedFeat = DailyRowDropParsedFilter<'feat', InitialFeatFilters, FeatPF2e>

type DailyRowDropParsedSpell = DailyRowDropParsedFilter<'spell', InitialSpellFilters, SpellPF2e>

type DailyRowDropParsedFilter<S extends string, F extends BaseInitialFilters, I extends ItemPF2e> = {
    type: S
    search: DeepRequired<F>
    drop?: DailyRowDropFunction<DailyGenerics, I>
}

type DailyRow<T extends DailyGenerics = DailyGenerics> =
    | DailyRowInput<T>
    | DailyRowSelect<T>
    | DailyRowRandom<T>
    | DailyRowCombo<T>
    | DailyRowDrop<T>
    | DailyRowAlert<T>

type BaseDailyRow<T extends DailyGenerics = DailyGenerics, R extends DailyRowType = DailyRowType> = DailyConditional<T> & {
    /**
     * Type of row, must be one of the following:
     *
     * 'combo' | 'select' | 'input' | 'random' | 'alert' | 'drop'
     */
    type: R
    /**
     * A string representing this row (must be unique among all rows of this daily).
     */
    slug: T[0]
    /**
     * This label will only be used in the case of multiple rows being displayed for this daily.
     *
     * If this row is uniquely shown, then the daily label is used instead.
     *
     * Can be a function returning the label.
     */
    label?: DailyLabel<T>
    /**
     * If false, the selection made by the user for this row will not be saved between rests
     *
     * It is by default 'true', so all choices are saved by default.
     */
    save?: boolean
}

/**
 * This type is used when something in relation to this daily is missing and you want to offer a solution to the user.
 */
type DailyRowAlert<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'alert'> & {
    /**
     * Message displayed inside the input box.
     *
     * It should be very short or will not be shown in its entirety.
     *
     * Can be a function returning the message.
     */
    message: DailyValue<DailyValueArgs<T>, string>
    /**
     * The function that is used when the user clicks on the red triangle to fix the issue at hand.
     *
     * If return 'true', the preparation interface will be re-rendered.
     */
    fix: (args: DailyValueArgs<T>) => boolean | Promise<boolean>
}

/**
 * This type is used to display a simple field that accept user input.
 */
type DailyRowInput<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'input'> & {
    /**
     * If the input should have a placeholder when empty.
     */
    placeholder?: string
}

type DailyOptions = (string | { value: string; label: string })[]

/**
 * This type display a dropdown field.
 */
type DailyRowSelect<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'select'> & {
    /**
     * The list of options provided to the select field.
     *
     * Each can be a string or {value: string, label: string}.
     *
     * If an entry is a string, it will be transformed into {value: string, label: string} while using the labelizer for the label if provided.
     *
     * Can be a function returning the options.
     *
     * If the list returned is empty, the row will be skipped.
     */
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    /**
     * Function that return a function accepting a string as argument, it is used to create the labels from the options list.
     */
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

/**
 * This type is used to display different options that will be randomly rolled for the character, the user cannot interract with it.
 *
 * The options are shown inside the input box in interval automatically.
 */
type DailyRowRandom<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'random'> & {
    /**
     * The list of options provided to the select field.
     *
     * Each can be a string or {value: string, label: string}.
     *
     * If an entry is a string, it will be transformed into {value: string, label: string} while using the labelizer for the label if provided.
     *
     * Can be a function returning the options.
     *
     * If the list returned is empty, the row will be skipped.
     */
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    /**
     * Function that return a function accepting a string as argument, it is used to create the labels from the options list.
     */
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

/**
 * This type is a combo of the 'select' and 'input' types, it offers both the dropdown and input fields
 * so the user can select one of the provided options or input something manually.
 */
type DailyRowCombo<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'combo'> & {
    /**
     * If the input should have a placeholder when empty.
     */
    placeholder?: string
    /**
     * The list of options provided to the select field.
     *
     * Each can be a string or {value: string, label: string}.
     *
     * If an entry is a string, it will be transformed into {value: string, label: string} while using the labelizer for the label if provided.
     *
     * Can be a function returning the options.
     *
     * The row will not be skipped if the list returned is empty.
     */
    options: DailyValue<DailyValueArgs<T>, DailyOptions>
    /**
     * Function that return a function accepting a string as argument, it is used to create the labels from the options list.
     */
    labelizer?: (args: DailyValueArgs<T>) => (value: string) => string
}

/**
 * This type is used when the user should drag & drop an item.
 *
 * It provides a search button for the user to open the compendium browser using filters.
 *
 * A lot of validation is done to make sure the user dropped the correct item (if a filter is provided).
 */
type DailyRowDrop<T extends DailyGenerics = DailyGenerics> = BaseDailyRow<T, 'drop'> &
    (DailyRowDropFeat<T> | DailyRowDropSpell<T>)

type DailyRowTemplate<T extends DailyGenerics = DailyGenerics> = {
    label: string
    value: string
    order: number
    selected?: string
    placeholder?: string
    options?: SelectOption[]
    data: {
        /**
         * The type of row: 'combo' | 'select' | 'input' | 'random' | 'alert' | 'drop'
         */
        type: DailyRowType
        /**
         * The daily unique key
         */
        daily: string
        /**
         * The unique row slug
         */
        row: T[0]
        input?: boolean
        uuid?: ItemUUID | ''
    }
}

/**
 * An object that contains the different row fields data organized by rows
 *
 * fields = {
 *   row1Slug: {...},
 *   row2Slug: {...},
 *   row3Slug: {...},
 * }
 */
type DailyRowFields<T extends DailyGenerics = DailyGenerics> = Record<T[0], DailyRowField<T>>

/**
 * An object that contains the data of a row field
 */
type DailyRowField<T extends DailyGenerics = DailyGenerics> = Omit<DailyRowTemplate<T>['data'], 'input' | 'uuid'> & {
    /**
     * The value of the row field
     */
    value: string
    /**
     * Used with 'combo' field. Is 'true' if the user manually typed and 'false' if the user selected an options from the dropdown.
     *
     * Make note that this is a string containing 'true' or 'false' and not a boolean.
     */
    input?: `${boolean}`
    /**
     * If a 'drop' field, it will contain the uuid of the dropped item.
     */
    uuid?: ItemUUID
}

type DailySavedDrop = { uuid: ItemUUID; name: string }
type DailySavedCombo = { selected: string; input: boolean }
type DailySavedValue = string | DailySavedDrop | DailySavedCombo
type DailySaved = Record<string, DailySavedValue>
type DailyCustom = Record<string, any>
type SelectOption = { value: string; label: string }
type DailySimplifiableValue = number | 'half' | 'level'

type ItemUUID = `Actor.${string}.Item.${string}` | `Compendium.${string}.${string}` | `Item.${string}`

type EqualTo = { eq: [string, string | number] }
type GreaterThan = { gt: [string, string | number] }
type GreaterThanEqualTo = { gte: [string, string | number] }
type LessThan = { lt: [string, string | number] }
type LessThanEqualTo = { lte: [string, string | number] }
type BinaryOperation = EqualTo | GreaterThan | GreaterThanEqualTo | LessThan | LessThanEqualTo
type Atom = string | BinaryOperation

type Conjunction = { and: PredicateStatement[] }
type Disjunction = { or: PredicateStatement[] }
type Negation = { not: PredicateStatement }
type AlternativeDenial = { nand: PredicateStatement[] }
type JointDenial = { nor: PredicateStatement[] }
type Conditional = { if: PredicateStatement; then: PredicateStatement }
type CompoundStatement = Conjunction | Disjunction | AlternativeDenial | JointDenial | Negation | Conditional

type PredicateStatement = Atom | CompoundStatement

type RawPredicate = PredicateStatement[]

type PredicateMode = 'upgrade' | 'add'

type AncestryTrait =
    | 'half-elf'
    | 'half-orc'
    | 'aasimar'
    | 'aberration'
    | 'anadi'
    | 'android'
    | 'aphorite'
    | 'automaton'
    | 'azarketi'
    | 'beastkin'
    | 'catfolk'
    | 'changeling'
    | 'conrasu'
    | 'dhampir'
    | 'duskwalker'
    | 'dwarf'
    | 'elf'
    | 'fetchling'
    | 'fleshwarp'
    | 'ganzi'
    | 'geniekin'
    | 'ghoran'
    | 'gnoll'
    | 'gnome'
    | 'goblin'
    | 'goloma'
    | 'grippli'
    | 'halfling'
    | 'hobgoblin'
    | 'human'
    | 'ifrit'
    | 'kashrishi'
    | 'kitsune'
    | 'kobold'
    | 'leshy'
    | 'lizardfolk'
    | 'nagaji'
    | 'orc'
    | 'oread'
    | 'poppet'
    | 'ratfolk'
    | 'shisk'
    | 'shoony'
    | 'skeleton'
    | 'sprite'
    | 'strix'
    | 'suli'
    | 'sylph'
    | 'tengu'
    | 'tiefling'
    | 'undine'
    | 'vanara'
    | 'vishkanya'

type ClassTrait =
    | 'alchemist'
    | 'barbarian'
    | 'bard'
    | 'champion'
    | 'cleric'
    | 'druid'
    | 'fighter'
    | 'gunslinger'
    | 'inventor'
    | 'investigator'
    | 'magus'
    | 'monk'
    | 'oracle'
    | 'psychic'
    | 'ranger'
    | 'rogue'
    | 'sorcerer'
    | 'summoner'
    | 'swashbuckler'
    | 'thaumaturge'
    | 'witch'
    | 'wizard'

type AlignmentTrait = 'chaotic' | 'evil' | 'good' | 'lawful'

type ElementalTrait = 'air' | 'earth' | 'fire' | 'metal' | 'water'

type MagicalTradition = 'arcane' | 'divine' | 'occult' | 'primal'

type WeaponDamage = 'bludgeoning' | 'piercing' | 'slashing' | 'modular'

type EnergyDamageType = 'acid' | 'cold' | 'electricity' | 'fire' | 'force' | 'negative' | 'positive' | 'sonic'

type DamageTrait =
    | AlignmentTrait
    | ElementalTrait
    | EnergyDamageType
    | 'light'
    | 'magical'
    | 'mental'
    | 'nonlethal'
    | 'plant'
    | 'radiation'

type MagicSchool =
    | 'abjuration'
    | 'conjuration'
    | 'divination'
    | 'enchantment'
    | 'evocation'
    | 'illusion'
    | 'necromancy'
    | 'transmutation'

type SpellOtherTrait =
    | 'amp'
    | 'attack'
    | 'auditory'
    | 'aura'
    | 'beast'
    | 'cantrip'
    | 'composition'
    | 'concentrate'
    | 'consecration'
    | 'contingency'
    | 'curse'
    | 'cursebound'
    | 'darkness'
    | 'death'
    | 'detection'
    | 'disease'
    | 'dream'
    | 'eidolon'
    | 'emotion'
    | 'extradimensional'
    | 'fear'
    | 'fortune'
    | 'fungus'
    | 'healing'
    | 'hex'
    | 'incapacitation'
    | 'incarnate'
    | 'incorporeal'
    | 'inhaled'
    | 'light'
    | 'linguistic'
    | 'litany'
    | 'metamagic'
    | 'mindless'
    | 'misfortune'
    | 'morph'
    | 'move'
    | 'nonlethal'
    | 'olfactory'
    | 'plant'
    | 'poison'
    | 'polymorph'
    | 'possession'
    | 'prediction'
    | 'psyche'
    | 'revelation'
    | 'scrying'
    | 'shadow'
    | 'sleep'
    | 'stance'
    | 'summoned'
    | 'teleportation'
    | 'true-name'
    | 'visual'

type SpellTrait = AlignmentTrait | ClassTrait | DamageTrait | ElementalTrait | MagicSchool | MagicalTradition | SpellOtherTrait

type FeatTrait =
    | AncestryTrait
    | ClassTrait
    | DamageTrait
    | MagicSchool
    | MagicalTradition
    | SpellTrait
    | 'additive1'
    | 'additive2'
    | 'additive3'
    | 'aftermath'
    | 'alchemical'
    | 'archetype'
    | 'auditory'
    | 'aura'
    | 'class'
    | 'concentrate'
    | 'dedication'
    | 'detection'
    | 'deviant'
    | 'downtime'
    | 'emotion'
    | 'evolution'
    | 'esoterica'
    | 'exploration'
    | 'fear'
    | 'finisher'
    | 'flourish'
    | 'fortune'
    | 'general'
    | 'injury'
    | 'lineage'
    | 'manipulate'
    | 'metamagic'
    | 'mindshift'
    | 'modification'
    | 'move'
    | 'multiclass'
    | 'oath'
    | 'olfactory'
    | 'open'
    | 'pervasive-magic'
    | 'poison'
    | 'press'
    | 'rage'
    | 'reckless'
    | 'reflection'
    | 'secret'
    | 'skill'
    | 'social'
    | 'spellshot'
    | 'stamina'
    | 'stance'
    | 'tandem'
    | 'time'
    | 'true-name'
    | 'unstable'
    | 'vigilante'
    | 'virulent'

type CommonSortByOption = 'name' | 'level'
type SortByOption = CommonSortByOption | 'price'
type SortDirection = 'asc' | 'desc'

type SkillLongForm =
    | 'acrobatics'
    | 'arcana'
    | 'athletics'
    | 'crafting'
    | 'deception'
    | 'diplomacy'
    | 'intimidation'
    | 'medicine'
    | 'nature'
    | 'occultism'
    | 'performance'
    | 'religion'
    | 'society'
    | 'stealth'
    | 'survival'
    | 'thievery'

type Rarity = 'common' | 'uncommon' | 'rare' | 'unique'

type SpellCategory = 'focus' | 'ritual' | 'spell' | 'cantrip'

interface BaseInitialFilters<T extends string = string> {
    searchText?: string
    traits?: {
        values: T[]
        conjunction?: 'and' | 'or'
    }
    orderBy?: SortByOption
    orderDirection?: SortDirection
}

interface InitialFeatFilters extends BaseInitialFilters<FeatTrait> {
    ancestry?: string[]
    classes?: string[]
    feattype?: FeatType[]
    skills?: SkillLongForm[]
    rarity?: Rarity[]
    source?: string[]
    level?: { min?: number; max?: number }
    orderBy?: CommonSortByOption
}

interface InitialSpellFilters extends BaseInitialFilters<SpellTrait> {
    timefilter?: string
    category?: SpellCategory[]
    classes?: string[]
    level?: number[]
    rarity?: Rarity[]
    school?: MagicSchool[]
    source?: string[]
    traditions?: MagicalTradition[]
    orderBy?: CommonSortByOption
}

type RuleElementSource = {
    key?: unknown
    data?: unknown
    value?: unknown
    label?: unknown
    slug?: unknown
    predicate?: RawPredicate
    priority?: number
    ignored?: unknown
    requiresInvestment?: unknown
    requiresEquipped?: unknown
    removeUponCreate?: unknown
}

interface AELikeSource extends RuleElementSource {
    mode?: PredicateMode
    path?: unknown
    phase?: unknown
}

interface FlatModifierSource extends RuleElementSource {
    selector?: unknown
    min?: unknown
    max?: unknown
    type?: unknown
    ability?: unknown
    force?: unknown
    damageType?: unknown
    damageCategory?: unknown
    critical?: unknown
    hideIfDisabled?: unknown
    fromEquipment?: unknown
}

interface IWRRuleElementSource extends RuleElementSource {
    type?: unknown
    exceptions?: unknown
    override?: unknown
}

type DailyRuleSource = AELikeSource | IWRRuleElementSource | FlatModifierSource

type ZeroToTwo = 0 | 1 | 2
type ZeroToThree = ZeroToTwo | 3 // +1!
type OneToThree = Exclude<ZeroToThree, 0>
type TwoToThree = Exclude<OneToThree, 1>
type ZeroToFour = ZeroToThree | 4
type OneToFour = Exclude<ZeroToFour, 0>
type ZeroToFive = ZeroToFour | 5
type OneToFive = OneToThree | Extract<ZeroToFive, 4 | 5>
type ZeroToTen = ZeroToFive | 6 | 7 | 8 | 9 | 10
type OneToTen = Exclude<ZeroToTen, 0>
type ZeroToEleven = ZeroToTen | 11

type CreateSkillArgs = { skill: string; value: number | string; mode?: PredicateMode; predicate?: RawPredicate }
type CreateLanguageArgs = { language: string; mode?: PredicateMode; predicate?: RawPredicate }
type CreateLoreArgs = { name: string; rank: number }
type CreateResistanceArgs = { type: string; value: number | string | 'half'; predicate?: RawPredicate }
type CreateScrollArgs = { uuid: ItemUUID; level?: number }

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }
type DeepRequired<T> = { [K in keyof T]: DeepRequired<T[K]> } & Required<T>

type PropertyRuneType = 'propertyRune1' | 'propertyRune2' | 'propertyRune3' | 'propertyRune4'

interface ItemFlags {
    core?: {
        sourceId?: ItemUUID
    }
    [key: string]: Record<string, unknown> | undefined
}

interface EffectDurationSource {
    startTime: number
    seconds: number | undefined
    combat?: string
    rounds: number | undefined
    turns: number | undefined
    startRound: number | null
    startTurn: number | null
}

interface EffectChangeSource {
    key: string
    value: string
    mode: 0 | 1 | 2 | 3 | 4 | 5
    priority: number
}

interface ActiveEffectSource {
    _id: string
    label: string
    duration: EffectDurationSource
    changes: EffectChangeSource[]
    disabled: boolean
    icon: ImageFilePath
    tint: string
    origin: string | undefined
    transfer: boolean
    flags: Record<string, unknown>
}

interface ItemSource<TType extends string = string, TSystemSource extends object = object> {
    _id: string
    name: string
    type: TType
    img: ImageFilePath
    system: TSystemSource
    effects: ActiveEffectSource[]
    folder?: string | null
    sort: number
    ownership: Record<string, 'NONE' | 'INHERIT' | 'LIMITED' | 'OBSERVER' | 'OWNER'>
    flags: ItemFlags
}

type NonPhysicalItemType =
    | 'action'
    | 'affliction'
    | 'ancestry'
    | 'background'
    | 'class'
    | 'condition'
    | 'deity'
    | 'effect'
    | 'feat'
    | 'heritage'
    | 'kit'
    | 'lore'
    | 'melee'
    | 'spell'
    | 'spellcastingEntry'

type PhysicalItemType = 'armor' | 'backpack' | 'book' | 'consumable' | 'equipment' | 'treasure' | 'weapon'

type ItemType = NonPhysicalItemType | PhysicalItemType

type CreatureTrait =
    | AlignmentTrait
    | 'aberration'
    | 'aeon'
    | 'aesir'
    | 'agathion'
    | 'alchemical'
    | 'angel'
    | 'animal'
    | 'anugobu'
    | 'aquatic'
    | 'archon'
    | 'astral'
    | 'asura'
    | 'azata'
    | 'beast'
    | 'boggard'
    | 'caligni'
    | 'celestial'
    | 'charau-ka'
    | 'clockwork'
    | 'construct'
    | 'couatl'
    | 'daemon'
    | 'darvakka'
    | 'demon'
    | 'dero'
    | 'devil'
    | 'dinosaur'
    | 'div'
    | 'dragon'
    | 'dream'
    | 'drow'
    | 'duergar'
    | 'duskwalker'
    | 'eidolon'
    | 'elemental'
    | 'ethereal'
    | 'evocation'
    | 'fiend'
    | 'formian'
    | 'fungus'
    | 'genie'
    | 'ghoran'
    | 'ghost'
    | 'ghoul'
    | 'ghul'
    | 'giant'
    | 'golem'
    | 'gremlin'
    | 'grioth'
    | 'grippli'
    | 'hag'
    | 'hantu'
    | 'herald'
    | 'humanoid'
    | 'ifrit'
    | 'ikeshti'
    | 'illusion'
    | 'incorporeal'
    | 'inevitable'
    | 'kami'
    | 'kovintus'
    | 'light'
    | 'locathah'
    | 'mental'
    | 'merfolk'
    | 'mindless'
    | 'minion'
    | 'monitor'
    | 'morlock'
    | 'mortic'
    | 'mummy'
    | 'munavri'
    | 'mutant'
    | 'nagaji'
    | 'nymph'
    | 'oni'
    | 'ooze'
    | 'orc'
    | 'oread'
    | 'paaridar'
    | 'petitioner'
    | 'phantom'
    | 'protean'
    | 'psychopomp'
    | 'qlippoth'
    | 'rakshasa'
    | 'reflection'
    | 'sahkil'
    | 'samsaran'
    | 'sea-devil'
    | 'serpentfolk'
    | 'seugathi'
    | 'shabti'
    | 'shadow'
    | 'shobhad'
    | 'siktempora'
    | 'skeleton'
    | 'skelm'
    | 'skulk'
    | 'soulbound'
    | 'spirit'
    | 'spriggan'
    | 'stheno'
    | 'summoned'
    | 'swarm'
    | 'sylph'
    | 'tane'
    | 'tanggal'
    | 'tengu'
    | 'time'
    | 'titan'
    | 'troll'
    | 'troop'
    | 'undead'
    | 'undine'
    | 'urdefhan'
    | 'vampire'
    | 'vanara'
    | 'velstrac'
    | 'vishkanya'
    | 'wayang'
    | 'werecreature'
    | 'wight'
    | 'wild-hunt'
    | 'wraith'
    | 'wyrwood'
    | 'xulgath'
    | 'zombie'

type PreciousMaterial =
    | 'abysium'
    | 'adamantine'
    | 'cold-iron'
    | 'darkwood'
    | 'djezet'
    | 'dragonhide'
    | 'grisantian-pelt'
    | 'inubrix'
    | 'mithral'
    | 'noqual'
    | 'orichalcum'
    | 'peachwood'
    | 'siccatite'
    | 'silver'
    | 'sisterstone-dusk'
    | 'sisterstone-scarlet'
    | 'sovereign-steel'
    | 'warpglass'

type NPCAttackTrait =
    | WeaponTrait
    | PreciousMaterial
    | RangeTrait
    | 'curse'
    | 'reach-0'
    | 'reach-10'
    | 'reach-15'
    | 'reach-20'
    | 'reach-25'
    | 'reach-30'
    | 'reach-40'
    | 'reach-50'
    | 'reach-60'
    | 'reach-100'
    | 'reach-1000'
    | 'reload-0'
    | 'reload-1'
    | 'reload-2'
    | 'reload-1-min'

type RangeTrait =
    | 'range-5'
    | 'range-10'
    | 'range-15'
    | 'range-20'
    | 'range-25'
    | 'range-30'
    | 'range-40'
    | 'range-50'
    | 'range-60'
    | 'range-70'
    | 'range-80'
    | 'range-90'
    | 'range-100'
    | 'range-110'
    | 'range-120'
    | 'range-140'
    | 'range-150'
    | 'range-160'
    | 'range-170'
    | 'range-180'
    | 'range-190'
    | 'range-200'
    | 'range-210'
    | 'range-220'
    | 'range-230'
    | 'range-240'
    | 'range-250'
    | 'range-260'
    | 'range-270'
    | 'range-280'
    | 'range-290'
    | 'range-300'
    | 'range-310'
    | 'range-320'
    | 'range-500'
    | 'range-increment-5'
    | 'range-increment-10'
    | 'range-increment-15'
    | 'range-increment-20'
    | 'range-increment-25'
    | 'range-increment-30'
    | 'range-increment-40'
    | 'range-increment-50'
    | 'range-increment-60'
    | 'range-increment-70'
    | 'range-increment-75'
    | 'range-increment-80'
    | 'range-increment-90'
    | 'range-increment-100'
    | 'range-increment-110'
    | 'range-increment-120'
    | 'range-increment-130'
    | 'range-increment-140'
    | 'range-increment-150'
    | 'range-increment-160'
    | 'range-increment-170'
    | 'range-increment-180'
    | 'range-increment-190'
    | 'range-increment-200'
    | 'range-increment-210'
    | 'range-increment-220'
    | 'range-increment-230'
    | 'range-increment-240'
    | 'range-increment-250'
    | 'range-increment-260'
    | 'range-increment-270'
    | 'range-increment-280'
    | 'range-increment-290'
    | 'range-increment-300'
    | 'range-increment-310'
    | 'range-increment-320'

type ItemTrait = ActionTrait | CreatureTrait | PhysicalItemTrait | NPCAttackTrait

interface ItemTraits<T extends ItemTrait = ItemTrait> {
    value: T[]
    rarity?: Rarity
    custom?: string
}

interface ItemSystemSource {
    description: {
        value: string
    }
    source: {
        value: string
    }
    traits?: ItemTraits
    options?: {
        value: string[]
    }
    rules: RuleElementSource[]
    slug: string | null
    schema: DocumentSchemaRecord
}

interface NewDocumentSchemaRecord {
    version: null
    lastMigration: null
}

interface MigratedDocumentSchemaRecord {
    version: number
    lastMigration: {
        datetime: string
        version: {
            schema: number | null
            system?: string
            foundry?: string
        }
    } | null
}

type DocumentSchemaRecord = NewDocumentSchemaRecord | MigratedDocumentSchemaRecord

type ItemGrantDeleteAction = 'cascade' | 'detach' | 'restrict'

interface ItemGrantSource {
    id: string
    onDelete?: ItemGrantDeleteAction
}

interface ItemSourceFlagsPF2e extends DeepPartial<ItemFlags> {
    pf2e?: {
        rulesSelections?: Record<string, string | number | object>
        itemGrants?: Record<string, ItemGrantSource>
        grantedBy?: ItemGrantSource | null
        [key: string]: unknown
    }
}

interface BaseItemSourcePF2e<TType extends ItemType = ItemType, TSystemSource extends ItemSystemSource = ItemSystemSource>
    extends ItemSource<TType, TSystemSource> {
    flags: ItemSourceFlagsPF2e
}

type LoreSource = BaseItemSourcePF2e<'lore', LoreSystemSource>

interface LoreSystemSource extends ItemSystemSource {
    mod: {
        value: number
    }
    proficient: {
        value: ZeroToFour
    }
    variants?: Record<string, { label: string; options: string }>
}

type FeatSource = BaseItemSourcePF2e<'feat', FeatSystemSource>

interface ItemLevelData {
    level: {
        value: number
    }
}

type FeatTraits = TraitsWithRarity<FeatTrait>

type FeatType =
    | 'ancestry'
    | 'ancestryfeature'
    | 'class'
    | 'classfeature'
    | 'skill'
    | 'general'
    | 'archetype'
    | 'bonus'
    | 'pfsboon'
    | 'deityboon'
    | 'curse'

type ActionType = 'action' | 'reaction' | 'free' | 'passive'

interface PrerequisiteTagData {
    value: string
}

interface FrequencySource {
    value?: number
    max: number
    per: 'PT1M' | 'PT10M' | 'PT1H' | 'PT24H' | 'day' | 'P1W'
}

interface FeatSystemSource extends ItemSystemSource, ItemLevelData {
    traits: FeatTraits
    featType: {
        value: FeatType
    }
    /** Whether this feat must be taken at character level 1 */
    onlyLevel1: boolean
    /** The maximum number of times this feat can be taken by a character. A value of `null` indicates no limit */
    maxTakable: number | null
    actionType: {
        value: ActionType
    }
    actions: {
        value: OneToThree | null
    }
    prerequisites: {
        value: PrerequisiteTagData[]
    }
    location: string | null
    frequency?: FrequencySource
}

type SpellSource = BaseItemSourcePF2e<'spell', SpellSystemSource>

type SpellTraits = TraitsWithRarity<SpellTrait>

interface ValuesList<T extends string = string> {
    value: T[]
    custom: string
}

type MagicTradition = 'arcane' | 'divine' | 'occult' | 'primal'

type SpellComponent = 'focus' | 'material' | 'somatic' | 'verbal'

type EffectAreaType = 'burst' | 'cone' | 'cube' | 'emanation' | 'line' | 'square'

type EffectAreaSize =
    | 5
    | 40
    | 10
    | 20
    | 30
    | 50
    | 15
    | 25
    | 45
    | 60
    | 65
    | 75
    | 80
    | 90
    | 100
    | 120
    | 360
    | 500
    | 1000
    | 1320
    | 5280

interface SpellDamage {
    template: SpellDamageTemplate
    context: DamageRollContext
}

type AbilityString = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

interface ValueAndMaybeMax {
    value: number
    max?: number
}

type ValueAndMax = Required<ValueAndMaybeMax>

interface SpellHeighteningFixed {
    type: 'fixed'
    levels: Record<OneToTen, Partial<SpellSystemSource>>
}

interface SpellHeighteningInterval {
    type: 'interval'
    interval: number
    damage: Record<string, string>
}

interface SpellOverlayOverride {
    _id: string
    system: Partial<SpellSystemSource>
    name?: string
    overlayType: 'override'
    sort: number
}

/** Not implemented */
interface SpellOverlayDamage {
    overlayType: 'damage'
    choices: DamageType[]
}

type SpellOverlay = SpellOverlayOverride | SpellOverlayDamage

type PhysicalDamageType = 'bludgeoning' | 'piercing' | 'slashing' | 'bleed'

type LifeEnergyDamageType = 'positive' | 'negative'

type AlignmentDamageType = 'chaotic' | 'lawful' | 'good' | 'evil'

type DamageType = PhysicalDamageType | EnergyDamageType | AlignmentDamageType | 'mental' | 'poison' | 'untyped'

interface SpellDamage {
    template: SpellDamageTemplate
    context: DamageRollContext
}

type SpellType = 'attack' | 'save' | 'heal' | 'utility'

type SaveType = 'fortitude' | 'reflex' | 'will'

interface SpellSystemSource extends ItemSystemSource, ItemLevelData {
    traits: SpellTraits
    level: {
        value: OneToTen
    }
    spellType: {
        value: SpellType
    }
    category: {
        value: SpellCategory
    }
    traditions: ValuesList<MagicTradition>
    school: {
        value: MagicSchool
    }
    components: Record<SpellComponent, boolean>
    materials: {
        value: string
    }
    target: {
        value: string
    }
    range: {
        value: string
    }
    area: {
        value: EffectAreaSize
        type: EffectAreaType
        details?: string
    } | null
    time: {
        value: string
    }
    duration: {
        value: string
    }
    damage: {
        value: Record<string, SpellDamage>
    }
    heightening?: SpellHeighteningFixed | SpellHeighteningInterval
    overlays?: Record<string, SpellOverlay>
    save: {
        basic: string
        value: SaveType | ''
        dc?: number
        str?: string
    }
    sustained: {
        value: false
    }
    cost: {
        value: string
    }
    ability: {
        value: AbilityString
    }
    hasCounteractCheck: {
        value: boolean
    }
    location: {
        value: string
        signature?: boolean
        heightenedLevel?: number
        autoHeightenLevel?: OneToTen | null
        uses?: ValueAndMax
    }
}

type ArmorTrait =
    | AlignmentTrait
    | ElementalTrait
    | MagicSchool
    | MagicalTradition
    | 'apex'
    | 'artifact'
    | 'auditory'
    | 'bulwark'
    | 'clockwork'
    | 'comfort'
    | 'cursed'
    | 'extradimensional'
    | 'focused'
    | 'force'
    | 'flexible'
    | 'intelligent'
    | 'invested'
    | 'light'
    | 'magical'
    | 'noisy'

type ConsumableTrait =
    | DamageTrait
    | ElementalTrait
    | MagicSchool
    | MagicalTradition
    | 'additive1'
    | 'additive2'
    | 'additive3'
    | 'alchemical'
    | 'attack'
    | 'auditory'
    | 'aura'
    | 'catalyst'
    | 'clockwork'
    | 'consumable'
    | 'contact'
    | 'cursed'
    | 'drug'
    | 'elixir'
    | 'emotion'
    | 'fear'
    | 'fey'
    | 'fortune'
    | 'fulu'
    | 'gadget'
    | 'healing'
    | 'incapacitation'
    | 'infused'
    | 'ingested'
    | 'inhaled'
    | 'injury'
    | 'kobold'
    | 'light'
    | 'magical'
    | 'mechanical'
    | 'misfortune'
    | 'morph'
    | 'mutagen'
    | 'oil'
    | 'olfactory'
    | 'poison'
    | 'polymorph'
    | 'potion'
    | 'precious'
    | 'scroll'
    | 'scrying'
    | 'sleep'
    | 'snare'
    | 'spellgun'
    | 'splash'
    | 'structure'
    | 'talisman'
    | 'teleportation'
    | 'trap'
    | 'virulent'
    | 'visual'
    | 'wand'

type EquipmentTrait =
    | AlignmentTrait
    | AncestryTrait
    | ElementalTrait
    | EnergyDamageType
    | MagicSchool
    | MagicalTradition
    | 'adjustment'
    | 'alchemical'
    | 'apex'
    | 'artifact'
    | 'auditory'
    | 'aura'
    | 'clockwork'
    | 'companion'
    | 'contract'
    | 'consecration'
    | 'cursed'
    | 'darkness'
    | 'death'
    | 'detection'
    | 'eidolon'
    | 'emotion'
    | 'extradimensional'
    | 'fear'
    | 'focused'
    | 'fortune'
    | 'fulu'
    | 'gadget'
    | 'grimoire'
    | 'healing'
    | 'infused'
    | 'intelligent'
    | 'invested'
    | 'light'
    | 'magical'
    | 'mental'
    | 'misfortune'
    | 'morph'
    | 'mounted'
    | 'nonlethal'
    | 'plant'
    | 'poison'
    | 'portable'
    | 'precious'
    | 'revelation'
    | 'saggorak'
    | 'scrying'
    | 'shadow'
    | 'sleep'
    | 'spellheart'
    | 'staff'
    | 'steam'
    | 'structure'
    | 'tattoo'
    | 'teleportation'
    | 'visual'
    | 'wand'

type WeaponTrait =
    | AlignmentTrait
    | AncestryTrait
    | ElementalTrait
    | EnergyDamageType
    | MagicSchool
    | MagicalTradition
    | 'alchemical'
    | 'agile'
    | 'artifact'
    | 'attached'
    | 'attached-to-shield'
    | 'attached-to-crossbow-or-firearm'
    | 'auditory'
    | 'backstabber'
    | 'backswing'
    | 'bomb'
    | 'brutal'
    | 'capacity-3'
    | 'capacity-4'
    | 'capacity-5'
    | 'climbing'
    | 'clockwork'
    | 'cobbled'
    | 'combination'
    | 'concealable'
    | 'concussive'
    | 'consumable'
    | 'critical-fusion'
    | 'cursed'
    | 'deadly-d6'
    | 'deadly-d8'
    | 'deadly-2d8'
    | 'deadly-3d8'
    | 'deadly-4d8'
    | 'deadly-d10'
    | 'deadly-2d10'
    | 'deadly-3d10'
    | 'deadly-4d10'
    | 'deadly-d12'
    | 'deadly-2d12'
    | 'deadly-3d12'
    | 'deadly-4d12'
    | 'death'
    | 'disarm'
    | 'disease'
    | 'double-barrel'
    | 'emotion'
    | 'fatal-aim-d10'
    | 'fatal-aim-d12'
    | 'fatal-d8'
    | 'fatal-d10'
    | 'fatal-d12'
    | 'fear'
    | 'finesse'
    | 'forceful'
    | 'fortune'
    | 'free-hand'
    | 'fungus'
    | 'grapple'
    | 'hampering'
    | 'healing'
    | 'infused'
    | 'inhaled'
    | 'injection'
    | 'intelligent'
    | 'invested'
    | 'jousting-d6'
    | 'kickback'
    | 'light'
    | 'magical'
    | 'mental'
    | 'modular'
    | 'monk'
    | 'nonlethal'
    | 'olfactory'
    | 'parry'
    | 'plant'
    | 'poison'
    | 'propulsive'
    | 'ranged-trip'
    | 'reach'
    | 'repeating'
    | 'resonant'
    | 'saggorak'
    | 'scatter-5'
    | 'scatter-10'
    | 'scatter-15'
    | 'shadow'
    | 'shove'
    | 'splash'
    | 'staff'
    | 'sweep'
    | 'tech'
    | 'teleportation'
    | 'tethered'
    | 'thrown'
    | 'thrown-10'
    | 'thrown-15'
    | 'thrown-20'
    | 'thrown-30'
    | 'thrown-40'
    | 'thrown-60'
    | 'thrown-80'
    | 'thrown-100'
    | 'thrown-200'
    | 'trip'
    | 'twin'
    | 'two-hand-d6'
    | 'two-hand-d8'
    | 'two-hand-d10'
    | 'two-hand-d12'
    | 'unarmed'
    | 'versatile-acid'
    | 'versatile-b'
    | 'versatile-chaotic'
    | 'versatile-cold'
    | 'versatile-electricity'
    | 'versatile-evil'
    | 'versatile-fire'
    | 'versatile-force'
    | 'versatile-good'
    | 'versatile-lawful'
    | 'versatile-negative'
    | 'versatile-p'
    | 'versatile-positive'
    | 'versatile-s'
    | 'versatile-sonic'
    | 'volley-20'
    | 'volley-30'
    | 'volley-50'

type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | WeaponTrait

interface PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> extends TraitsWithRarity<T> {
    otherTags: string[]
}

interface PhysicalItemHitPoints {
    value: number
    max: number
    brokenThreshold: number
}

interface PartialPrice {
    value: Coins
    per?: number
}

interface Coins {
    pp?: number
    gp?: number
    sp?: number
    cp?: number
}

type AudioFileExtension = 'aac' | 'flac' | 'm4a' | 'mid' | 'mp3' | 'ogg' | 'opus' | 'wav' | 'webm'
type ImageFileExtension = 'apng' | 'avif' | 'bmp' | 'gif' | 'jpeg' | 'jpg' | 'png' | 'svg' | 'tiff' | 'webp'
type VideoFileExtension = 'm4v' | 'mp4' | 'ogg' | 'webm'

type HexColorString = `#${string}`
type AudioFilePath = `${string}.${AudioFileExtension}`
type ImageFilePath = `${string}.${ImageFileExtension}`
type VideoFilePath = `${string}.${VideoFileExtension}` | ImageFilePath
type FilePath = AudioFilePath | ImageFilePath | VideoFilePath

type IdentificationStatus = 'identified' | 'unidentified'

interface MystifiedData {
    name: string
    img: ImageFilePath
    data: {
        description: {
            value: string
        }
    }
}

type EquippedData = {
    carryType: ItemCarryType
    inSlot?: boolean
    handsHeld?: number
    invested?: boolean | null
}

type ItemCarryType = 'held' | 'worn' | 'stowed' | 'dropped'

interface IdentificationSource {
    status: IdentificationStatus
    unidentified: MystifiedData
    misidentified: {}
}

type PreciousMaterialType =
    | 'abysium'
    | 'adamantine'
    | 'cold-iron'
    | 'darkwood'
    | 'djezet'
    | 'dragonhide'
    | 'grisantian-pelt'
    | 'inubrix'
    | 'mithral'
    | 'noqual'
    | 'orichalcum'
    | 'peachwood'
    | 'siccatite'
    | 'silver'
    | 'sisterstone-dusk'
    | 'sisterstone-scarlet'
    | 'sovereign-steel'
    | 'warpglass'

type Size = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg'

interface PhysicalSystemSource extends ItemSystemSource, ItemLevelData {
    traits: PhysicalItemTraits
    quantity: number
    baseItem: string | null
    hp: PhysicalItemHitPoints
    hardness: number
    weight: {
        value: string
    }
    equippedBulk: {
        value: string | null
    }
    /** This is unused, remove when inventory bulk refactor is complete */
    unequippedBulk: {
        value: string
    }
    price: PartialPrice
    equipped: EquippedData
    identification: IdentificationSource
    stackGroup: string | null
    negateBulk: {
        value: string
    }
    containerId: string | null
    preciousMaterial: {
        value: Exclude<PreciousMaterialType, 'dragonhide' | 'grisantian-pelt'> | null
    }
    preciousMaterialGrade: {
        value: PreciousMaterialGrade | null
    }
    size: Size
    usage: {
        value: string
    }
    activations?: Record<string, ItemActivation>
    temporary?: boolean
}

interface ActionCost {
    type: Exclude<ActionType, 'passive'>
    value: OneToThree | null
}

interface ItemActivation {
    id: string
    description: {
        value: string
    }
    actionCost: ActionCost
    components: {
        command: boolean
        envision: boolean
        interact: boolean
        cast: boolean
    }
    frequency?: Frequency
    traits: ValuesList<ActionTrait>
}

interface Frequency extends FrequencySource {
    value: number
}

type ActionTrait =
    | 'half-elf'
    | 'half-orc'
    | 'aasimar'
    | 'aberration'
    | 'anadi'
    | 'android'
    | 'aphorite'
    | 'automaton'
    | 'azarketi'
    | 'beastkin'
    | 'catfolk'
    | 'changeling'
    | 'conrasu'
    | 'dhampir'
    | 'duskwalker'
    | 'dwarf'
    | 'elf'
    | 'fetchling'
    | 'fleshwarp'
    | 'ganzi'
    | 'geniekin'
    | 'ghoran'
    | 'gnoll'
    | 'gnome'
    | 'goblin'
    | 'goloma'
    | 'grippli'
    | 'halfling'
    | 'hobgoblin'
    | 'human'
    | 'ifrit'
    | 'kashrishi'
    | 'kitsune'
    | 'kobold'
    | 'leshy'
    | 'lizardfolk'
    | 'nagaji'
    | 'orc'
    | 'oread'
    | 'poppet'
    | 'ratfolk'
    | 'shisk'
    | 'shoony'
    | 'skeleton'
    | 'sprite'
    | 'strix'
    | 'suli'
    | 'sylph'
    | 'tengu'
    | 'tiefling'
    | 'undine'
    | 'vanara'
    | 'vishkanya'
    | 'alchemist'
    | 'barbarian'
    | 'bard'
    | 'champion'
    | 'cleric'
    | 'druid'
    | 'fighter'
    | 'gunslinger'
    | 'inventor'
    | 'investigator'
    | 'magus'
    | 'monk'
    | 'oracle'
    | 'psychic'
    | 'ranger'
    | 'rogue'
    | 'sorcerer'
    | 'summoner'
    | 'swashbuckler'
    | 'thaumaturge'
    | 'witch'
    | 'wizard'
    | 'chaotic'
    | 'evil'
    | 'good'
    | 'lawful'
    | 'air'
    | 'earth'
    | 'fire'
    | 'metal'
    | 'water'
    | 'acid'
    | 'cold'
    | 'electricity'
    | 'force'
    | 'negative'
    | 'positive'
    | 'sonic'
    | 'light'
    | 'magical'
    | 'mental'
    | 'nonlethal'
    | 'plant'
    | 'radiation'
    | 'abjuration'
    | 'conjuration'
    | 'divination'
    | 'enchantment'
    | 'evocation'
    | 'illusion'
    | 'necromancy'
    | 'transmutation'
    | 'arcane'
    | 'divine'
    | 'occult'
    | 'primal'
    | 'amp'
    | 'attack'
    | 'auditory'
    | 'aura'
    | 'beast'
    | 'cantrip'
    | 'composition'
    | 'concentrate'
    | 'consecration'
    | 'contingency'
    | 'curse'
    | 'cursebound'
    | 'darkness'
    | 'death'
    | 'detection'
    | 'disease'
    | 'dream'
    | 'eidolon'
    | 'emotion'
    | 'extradimensional'
    | 'fear'
    | 'fortune'
    | 'fungus'
    | 'healing'
    | 'hex'
    | 'incapacitation'
    | 'incarnate'
    | 'incorporeal'
    | 'inhaled'
    | 'linguistic'
    | 'litany'
    | 'metamagic'
    | 'mindless'
    | 'misfortune'
    | 'morph'
    | 'move'
    | 'olfactory'
    | 'poison'
    | 'polymorph'
    | 'possession'
    | 'prediction'
    | 'psyche'
    | 'revelation'
    | 'scrying'
    | 'shadow'
    | 'sleep'
    | 'stance'
    | 'summoned'
    | 'teleportation'
    | 'true-name'
    | 'visual'
    | 'additive1'
    | 'additive2'
    | 'additive3'
    | 'aftermath'
    | 'alchemical'
    | 'archetype'
    | 'artifact'
    | 'class'
    | 'dedication'
    | 'deviant'
    | 'downtime'
    | 'evolution'
    | 'esoterica'
    | 'exploration'
    | 'finisher'
    | 'flourish'
    | 'general'
    | 'injury'
    | 'lineage'
    | 'manipulate'
    | 'mindshift'
    | 'modification'
    | 'multiclass'
    | 'oath'
    | 'open'
    | 'pervasive-magic'
    | 'press'
    | 'rage'
    | 'reckless'
    | 'reflection'
    | 'secret'
    | 'skill'
    | 'social'
    | 'spellshot'
    | 'stamina'
    | 'tandem'
    | 'time'
    | 'unstable'
    | 'vigilante'
    | 'virulent'
    | 'catalyst'
    | 'clockwork'
    | 'consumable'
    | 'contact'
    | 'cursed'
    | 'drug'
    | 'elixir'
    | 'expandable'
    | 'fey'
    | 'fulu'
    | 'gadget'
    | 'infused'
    | 'ingested'
    | 'lozenge'
    | 'mechanical'
    | 'missive'
    | 'mutagen'
    | 'oil'
    | 'potion'
    | 'precious'
    | 'processed'
    | 'scroll'
    | 'snare'
    | 'spellgun'
    | 'splash'
    | 'structure'
    | 'talisman'
    | 'trap'
    | 'wand'
    | 'circus'
    | 'summon'

type PreciousMaterialGrade = 'low' | 'standard' | 'high'

type BasePhysicalItemSource<
    TType extends PhysicalItemType = PhysicalItemType,
    TSystemSource extends PhysicalSystemSource = PhysicalSystemSource
> = BaseItemSourcePF2e<TType, TSystemSource>

type OtherConsumableTag = 'herbal'

interface ConsumableTraits extends PhysicalItemTraits<ConsumableTrait> {
    otherTags: OtherConsumableTag[]
}

type ConsumableCategory =
    | 'ammo'
    | 'catalyst'
    | 'drug'
    | 'elixir'
    | 'fulu'
    | 'gadget'
    | 'oil'
    | 'other'
    | 'mutagen'
    | 'poison'
    | 'potion'
    | 'scroll'
    | 'snare'
    | 'talisman'
    | 'tool'
    | 'wand'

interface ConsumableSystemSource extends PhysicalSystemSource {
    traits: ConsumableTraits

    consumableType: {
        value: ConsumableCategory
    }
    charges: {
        value: number
        max: number
    }
    consume: {
        value: string
    }
    autoDestroy: {
        value: boolean
    }
    spell: SpellSource | null
}

type ConsumableSource = BasePhysicalItemSource<'consumable', ConsumableSystemSource>

type DailyUtils = {
    /**
     * Getter that returns the list of all system skills (those are not the localized values but the system names).
     */
    get skillNames(): string[]
    /**
     * Returns the localized value of a skill.
     */
    skillLabel: (skill: string) => string
    /**
     * Creates and returns a skill rule element.
     */
    createSkillRuleElement: (args: CreateSkillArgs) => AELikeSource
    /**
     * Creates and returns a lore item source object.
     */
    createLoreSource: ({ name, rank }: CreateLoreArgs) => LoreSource
    /**
     * Getter that returns the list of all system languages (those are not the localized values but the system names).
     */
    get languageNames(): string[]
    /**
     * Returns the localized value of a language.
     */
    languageLabel: (language: string) => string
    /**
     * Creates and returns a language rule element.
     */
    createLanguageRuleElement: (args: CreateLanguageArgs) => AELikeSource
    /**
     * Returns the localized value of a resistance.
     *
     * If a 'value' is also provided, it will concatenate it to the resistance (i.e. Fire 6)
     */
    resistanceLabel: (resistance: string, value?: number) => string
    /**
     * Creates and returns a resistance rule element.
     */
    createResistanceRuleElement: (args: CreateResistanceArgs) => IWRRuleElementSource
    /**
     * Creates and returns a feat item source object.
     */
    createFeatSource: (uuid: ItemUUID) => Promise<FeatSource>
    /**
     * Creates and returns a spell scroll item source object.
     */
    createSpellScrollSource: (args: CreateScrollArgs) => Promise<ConsumableSource>
    /**
     * Creates and returns a spell item source object.
     */
    createSpellSource: (uuid: ItemUUID) => Promise<SpellSource>
    /**
     * Getter that returns a rule element value string which uses half the actor's level.
     *
     * 'max(1,floor(@actor.level/2))'
     */
    get halfLevelString(): string
    /**
     * This function will try to locate the 'ChoiceSet' rule element on 'item' that contains the 'option' and will return the choise that was made.
     */
    getChoiSetRuleSelection: (item: ItemPF2e, option: string) => string | undefined
    /**
     * Returns the localized value of a proficiency when provided a 'rank' as argument.
     */
    proficiencyLabel: (rank: ZeroToFour) => string
    /**
     * Will randomly pick one option among the provided 'options' list.
     *
     * 'options' can be a list of string or {value: string, label: string}, in the case of the later, the 'value' is returned.
     */
    randomOption: <T extends string>(options: T[]) => Promise<T>
    /**
     * Calculates and returns half the level of provided 'actor' rounded down and minimum 1.
     */
    halfLevelValue: (actor: CharacterPF2e) => number
    /**
     * Returns an array containing a sequence of number from 'start' to 'end'.
     */
    sequenceArray: (start: number, end: number) => number[]
    /**
     * Returns the localized value of a weapon damage.
     */
    damageLabel: (damage: string) => string
    /**
     * Returns the localized value of a weapon trait.
     */
    weaponTraitLabel: (trait: string) => string
    /**
     * Returns the localized value of a weapon property rune.
     */
    weaponPropertyRunesLabel: (rune: string) => string
    /**
     * Checks if a weapon/armor has any free property slots.
     */
    hasFreePropertySlot: (item: WeaponPF2e | ArmorPF2e) => boolean
    /**
     * Returns the first free property slots of a weapon/armor if any.
     */
    getFreePropertyRuneSlot: (item: WeaponPF2e | ArmorPF2e) => null | PropertyRuneType
}

type SpellGenerics = ['spell', {}, '']
type SkillGenerics = ['skill', {}, '']
type ResistanceGenerics = ['resistance', {}, '']
type LanguageGenerics = ['language', {}, '']
type FeatGenerics = ['feat', {}, '']

type CharacterPF2e = any
type ItemPF2e = any
type WeaponPF2e = any
type ArmorPF2e = any
type FeatPF2e = any
type SpellPF2e = any

interface MergeObjectOptions {
    insertKeys?: boolean
    insertValues?: boolean
    overwrite?: boolean
    inplace?: boolean
    enforceTypes?: boolean
    performDeletions?: boolean
}

declare function setProperty(object: object, key: string, value: unknown): boolean
declare function getProperty<T extends unknown>(object: object, key: string): T | undefined
declare function hasProperty(object: object, key: string): boolean
declare function diffObject<T extends Record<string, unknown> = Record<string, unknown>>(original: object, other: object): T
declare function getType(token: unknown): string
declare function invertObject(obj: object): object
declare function filterObject(source: object, template: object, keepSpecial?: boolean, templateValues?: boolean): object
declare function flattenObject(obj: {}, _d?: number): Record<string, unknown>
declare function expandObject<T extends object>(obj: object, _d?: number): T
declare function isObjectEmpty(obj: object): boolean
declare function mergeObject<T extends object, U extends object = T>(
    original: T,
    other?: U,
    { insertKeys, insertValues, overwrite, inplace, enforceTypes, performDeletions }?: MergeObjectOptions,
    _d?: number
): T & U
declare function duplicate<T>(original: T): T
declare function deepClone<T>(original: T): T
declare function debounce<T extends unknown[]>(callback: (...args: T) => unknown, delay: number): (...args: T) => void
declare function fromUuid<T>(uuid: string): Promise<T | null>

declare const ui: any
declare const game: any
declare const canvas: any
declare const CONFIG: any

interface DialogData {
    title?: string
    content?: string | HTMLElement
    close?: (html: HTMLElement | JQuery) => void
    buttons?: Record<string, DialogButton>
    default?: string
    render?: (html: HTMLElement | JQuery) => void
}

interface DialogButton {
    icon?: string
    label?: string
    condition?: boolean
    callback?: (html: JQuery, event: JQuery.ClickEvent) => void
}

interface ApplicationOptions {
    /** A named 'base application' which generates an additional hook */
    baseApplication: string | null
    /** The default pixel width for the rendered HTML */
    width: number | string | null
    /** The default pixel height for the rendered HTML */
    height: number | string | null
    /** The default offset-top position for the rendered HTML */
    top: number | null
    /** The default offset-left position for the rendered HTML */
    left: number | null
    /** A transformation scale for the rendered HTML */
    scale?: number | null
    /** Whether to display the application as a pop-out container */
    popOut: boolean
    /** Whether the rendered application can be minimized (popOut only) */
    minimizable: boolean
    /** Whether the rendered application can be drag-resized (popOut only) */
    resizable: boolean | null
    /** The default CSS id to assign to the rendered HTML */
    id: string
    /** An array of CSS string classes to apply to the rendered HTML */
    classes: string[]
    /** Track Tab navigation handlers which are active for this Application */
    tabs: TabsOptions[]
    dragDrop: {
        callbacks?: {
            dragover?: Function
            dragstart?: Function
            drop?: Function
        }
        dragSelector?: string
        dropSelector?: string
    }[]
    /** A default window title string (popOut only) */
    title: string
    /** The default HTML template path to render for this Application */
    template: string | null
    /**
     * A list of unique CSS selectors which target containers that should
     * have their vertical scroll positions preserved during a re-render.
     */
    scrollY: string[]
    /** filters An array of {@link SearchFilter} configuration objects. */
    filters: SearchFilterConfiguration[]
}

interface TabsOptions {
    navSelector?: string
    contentSelector?: string
    initial?: string
}

interface SearchFilterConfiguration {
    /** The CSS selector used to target the text input element. */
    inputSelector: string
    /** The CSS selector used to target the content container for these tabs. */
    contentSelector: string
    /** A callback function which executes when the filter changes. */
    callback?: Function
    /** The initial value of the search query. */
    initial?: string
    /** The number of milliseconds to wait for text input before processing. */
    delay?: number
}

interface RenderOptions extends Partial<ApplicationOptions> {
    /** The left positioning attribute */
    left?: number
    /** The top positioning attribute */
    top?: number
    /** The rendered width */
    width?: number
    /** The rendered height */
    height?: number
    /** The rendered transformation scale */
    scale?: number
    /** Apply focus to the application, maximizing it and bringing it to the top of the vertical stack. */
    focus?: boolean
    /** A context-providing string which suggests what event triggered the render */
    renderContext?: string
    /** The data change which motivated the render request */
    renderData?: Record<string, unknown>
    // Undocumented
    action?: UserAction
    // Undocumented: applicable only to `FormApplication`s
    editable?: boolean
}

type UserAction = 'create' | 'update' | 'delete'

interface ConfirmDialogParameters<Y = true, N = false> {
    title: string
    content: string
    yes?: () => Y
    no?: () => N
    render?: (html: JQuery) => void | Promise<void>
    defaultYes?: boolean
    rejectClose?: () => void | Promise<void>
    options?: Partial<ApplicationOptions>
}

declare class Dialog {
    static confirm<Y = true, N = false>({
        title,
        content,
        yes,
        no,
        render,
        defaultYes,
        rejectClose,
        options,
    }?: ConfirmDialogParameters<Y, N>): Promise<Y | N>

    static wait(data?: DialogData, options?: DialogOptions, renderOptions?: RenderOptions): Promise<any>

    static prompt(options?: PromptData): Promise<any>
}

interface PromptData extends DialogData {
    callback?: (html: JQuery, event: JQuery.ClickEvent) => void
    rejectClose?: boolean
    options?: DialogOptions
}

interface DialogOptions extends ApplicationOptions {
    jQuery?: boolean
}

interface TraitsWithRarity<T extends string> {
    value: T[]
    rarity: Rarity
    custom?: string
}

type SpellDamageTemplate = any
type DamageRollContext = any
type JQuery = any

declare namespace JQuery {
    type ClickEvent = MouseEvent
}
