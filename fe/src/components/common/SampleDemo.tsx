import React, { useState } from "react";
import SampleButton from "../Button/SampleButton";
import SampleInput from "../Input/SampleInput";
import SampleModal from "../Modal/SampleModal";

const SampleDemo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <SampleButton onClick={() => setModalOpen(true)}>
          Open Modal
        </SampleButton>
        <SampleButton variant="secondary">Secondary</SampleButton>
        <SampleButton variant="danger">Danger</SampleButton>
      </div>
      <SampleInput
        label="Sample Input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type something..."
      />
      <SampleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Modal"
      >
        <p>This is a sample modal content.</p>
        <SampleButton onClick={() => setModalOpen(false)}>Close</SampleButton>
      </SampleModal>
    </div>
  );
};

export default SampleDemo;
