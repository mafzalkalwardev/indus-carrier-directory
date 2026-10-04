"""Public dataset ids from data.transportation.gov."""

CORE_FEEDS = [
    "census",
    "carrier",
    "insur",
    "authhist",
    "inshist",
    "revoke",
    "boc3",
]

SAFETY_FEEDS = [
    "inspections",
    "units",
    "violations",
    "crashes",
    "sms",
    "oos",
]

FEEDS = {
    "census": {"view_id": "az4n-8mr2", "kind": "census"},
    "carrier": {"view_id": "inys-ebih", "kind": "carrier"},
    "insur": {"view_id": "c5y8-a4uz", "kind": "insur"},
    "authhist": {"view_id": "yu5v-wbh6", "kind": "authhist"},
    "inshist": {"view_id": "3uet-3z4i", "kind": "inshist"},
    "revoke": {"view_id": "wb4f-neki", "kind": "revoke"},
    "boc3": {"view_id": "6snj-ed7q", "kind": "boc3"},
    "inspections": {"view_id": "fx4q-ay7w", "kind": "inspections"},
    "units": {"view_id": "wt8s-2hbx", "kind": "units"},
    "violations": {"view_id": "876r-jsdb", "kind": "violations"},
    "crashes": {"view_id": "aayw-vxb3", "kind": "crashes"},
    "sms": {"view_id": "4y6x-dmck", "kind": "sms"},
    "oos": {"view_id": "p2mt-9ige", "kind": "oos"},
}

CARGO = {
    "crgo_genfreight": "General freight",
    "crgo_household": "Household goods",
    "crgo_metalsht": "Metal sheets, coils, rolls",
    "crgo_motoveh": "Motor vehicles",
    "crgo_drivetow": "Driveaway / towaway",
    "crgo_logpole": "Logs, poles, beams, lumber",
    "crgo_bldgmat": "Building materials",
    "crgo_mobilehm": "Mobile homes",
    "crgo_machlrg": "Machinery, large objects",
    "crgo_produce": "Fresh produce",
    "crgo_liqgas": "Liquids and gases",
    "crgo_intermodal": "Intermodal containers",
    "crgo_passengers": "Passengers",
    "crgo_oilfield": "Oilfield equipment",
    "crgo_livestock": "Livestock",
    "crgo_grainfeed": "Grain, feed, hay",
    "crgo_coalcoke": "Coal and coke",
    "crgo_meat": "Meat",
    "crgo_garbage": "Garbage and refuse",
    "crgo_usmail": "US mail",
    "crgo_chem": "Chemicals",
    "crgo_drybulk": "Dry bulk commodities",
    "crgo_coldfood": "Refrigerated food",
    "crgo_beverages": "Beverages",
    "crgo_paperprod": "Paper products",
    "crgo_utility": "Utility",
    "crgo_farmsupp": "Farm supplies",
    "crgo_construct": "Construction",
    "crgo_waterwell": "Water well",
    "crgo_cargoothr": "Other cargo",
}
