"use client";

import { useState } from "react";
// import { cn } from "@/lib/cn";
import { ConductorUser } from "@/lib/types";
import { ChevronDownIcon } from "lucide-react";

type UserMultiSelectDropdown = {
  type: "editing" | "search";
  filter: boolean;
  disabled: boolean;
  marketCenterId: string | null;
  placeholder: string;
  formFieldName: string;
  options: ConductorUser[];
  selectedOptions: ConductorUser[];
  handleSetSelectedOptions: (newSelected: ConductorUser[]) => void;
  error: string | null;
};

export default function UserMultiSelectDropdown({
  type,
  filter,
  disabled,
  marketCenterId,
  placeholder,
  formFieldName,
  options,
  selectedOptions,
  handleSetSelectedOptions,
  error,
}: UserMultiSelectDropdown) {
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);

  const handleSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    selection: ConductorUser
  ) => {
    const isChecked = event.target.checked;
    const selectedOptionSet = new Set(selectedOptions);
    if (isChecked) {
      selectedOptionSet.add(selection);
    } else {
      selectedOptionSet.delete(selection);
    }

    const newSelectedOptions = Array.from(selectedOptionSet);

    handleSetSelectedOptions(newSelectedOptions);
  };

  return (
    <label
      className={`relative flex items-center justify-between h-9 w-full min-w-0 text-sm bg-transparent px-3 py-2 whitespace-nowrap border ${!error ? "border-input" : "border-destructive"} rounded-md outline-none shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${disabled && "pointer-events-none cursor-not-allowed opacity-50"}`}
    >
      <input
        type="checkbox"
        className={`hidden peer`}
        disabled={disabled}
        onChange={() => setIsDropdownExpanded(!isDropdownExpanded)}
      />
      <p className="text-sm">{placeholder}</p>
      <ChevronDownIcon
        className={`size-4 peer-checked:-rotate-180 duration-450 ease-in-out`}
      />
      <ul
        className={`${isDropdownExpanded && "z-150"}
          absolute top-9 left-0 w-full max-h-85 overflow-scroll px-2 py-1.5 bg-white text-primary border shadow-md rounded-md opacity-0 peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity duration-450 ease-in-out`}
      >
        {isDropdownExpanded &&
          options.map((option, index) => {
            let isAlreadyAssignedToMC = false;
            // Default check users assigned to this market center
            if (marketCenterId) {
              isAlreadyAssignedToMC = option.marketCenterId === marketCenterId;
            }
            // if (type === "search" && isAlreadyAssignedToMC) {
            //   handleSetSelectedOptions([option]);
            // }
            // Filter out users assigned to other market centers
            if (
              type === "editing" &&
              filter &&
              option.marketCenterId &&
              option.marketCenterId !== marketCenterId
            ) {
              return null;
            }

            return (
              <li key={`${index}-${option.id}`} className="w-full">
                <label
                  htmlFor={`assignment-${option.id}`}
                  className={`flex items-center gap-2 w-full py-1.5 pr-8 pl-2 text-sm rounded-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground cursor-default hover:bg-secondary [&:has(input:checked)]:bg-secondary`}
                >
                  <input
                    type="checkbox"
                    id={`assignment-${option.id}`}
                    name={formFieldName}
                    value={option?.name || option.id.slice(0, 8)}
                    disabled={!isDropdownExpanded}
                    defaultChecked={isAlreadyAssignedToMC}
                    className={`size-3.52 cursor-pointer accent-primary focus:bg-accent focus:text-accent-foreground`} // hover:accent-secondary
                    onChange={(event) => handleSelection(event, option)}
                  />
                  <div className="px-2 py-1.5  gap-1">
                    <p className={"text-sm font-medium"}>{option.name}</p>
                    <p
                      className={
                        "text-xs font-medium text-muted-foreground capitalize"
                      }
                    >
                      {option?.role.split("_").join(" ").toLowerCase()} •{" "}
                      {option.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
      </ul>
    </label>
  );
}
