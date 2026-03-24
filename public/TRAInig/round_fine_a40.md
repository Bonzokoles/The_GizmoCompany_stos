cat > runpod_finetune_a40.py << 'EOFPYTHON'
import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import warnings
warnings.filterwarnings("ignore")

MODEL_NAME = "NousResearch/Hermes-3-Llama-3.1-8B"
DATASET_PATH = "./mistral_unified_validated.jsonl"
OUTPUT_DIR = "./mistral-uncensored-finetuned"

MAX_SEQ_LENGTH = 2048
BATCH_SIZE = 4
GRADIENT_ACCUMULATION = 4
LEARNING_RATE = 2e-4
NUM_EPOCHS = 1
WARMUP_STEPS = 100
SAVE_STEPS = 500
LOGGING_STEPS = 50

LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05

print("="*80)
print("RUNPOD A40 - FINE-TUNING MISTRAL UNCENSORED")
print("="*80)

if torch.cuda.is_available():
    print(f"\n✓ CUDA: {torch.cuda.get_device_name(0)}")
    print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f} GB")
else:
    print("\n✗ CUDA niedostępna!")
    
print(f"\n✓ PyTorch: {torch.__version__}")

print("\n"+"="*80)
print("ŁADOWANIE DATASETU")
print("="*80)

dataset = load_dataset('json', data_files=DATASET_PATH, split='train')
print(f"✓ Załadowano {len(dataset)} przykładów")

dataset = dataset.train_test_split(test_size=0.05, seed=42)
train_dataset = dataset['train']
eval_dataset = dataset['test']
print(f"✓ Train: {len(train_dataset)}, Eval: {len(eval_dataset)}")

print("\n"+"="*80)
print("ŁADOWANIE TOKENIZERA")
print("="*80)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
print(f"✓ Tokenizer załadowany (vocab: {len(tokenizer)})")

print("\n"+"="*80)
print("TOKENIZACJA")
print("="*80)

def format_chat(example):
    messages = example['messages']
    formatted_text = ""
    for msg in messages:
        role = msg.get('role', '')
        content = msg.get('content', '')
        if role == 'user':
            formatted_text += f"<s>[INST] {content} [/INST] "
        elif role == 'assistant':
            formatted_text += f"{content} </s>"
    return {"text": formatted_text}

def tokenize_function(examples):
    return tokenizer(examples['text'], truncation=True, max_length=MAX_SEQ_LENGTH, 
                    padding=False, return_tensors=None)  # Dynamic padding zamiast max_length

train_dataset = train_dataset.map(format_chat, remove_columns=train_dataset.column_names)
eval_dataset = eval_dataset.map(format_chat, remove_columns=eval_dataset.column_names)
train_dataset = train_dataset.map(tokenize_function, batched=True, remove_columns=['text'])
eval_dataset = eval_dataset.map(tokenize_function, batched=True, remove_columns=['text'])
print(f"✓ Tokenizacja zakończona")

print("\n"+"="*80)
print("ŁADOWANIE MODELU (4-bit)")
print("="*80)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True
)
print(f"✓ Model załadowany")

model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=LORA_R,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
    lora_dropout=LORA_DROPOUT,
    bias="none",
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, lora_config)
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"✓ LoRA: {trainable:,}/{total:,} ({100*trainable/total:.2f}%)")

print("\n"+"="*80)
print("KONFIGURACJA TRENINGU")
print("="*80)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=NUM_EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRADIENT_ACCUMULATION,
    learning_rate=LEARNING_RATE,
    warmup_steps=WARMUP_STEPS,
    logging_steps=LOGGING_STEPS,
    save_steps=SAVE_STEPS,
    save_total_limit=3,
    evaluation_strategy="epoch",  # Ewaluacja tylko na końcu epoki zamiast co 10K kroków
    # eval_steps=10000,  # Nieużywane gdy evaluation_strategy="epoch"
    bf16=True,
    gradient_checkpointing=True,
    optim="paged_adamw_8bit",
    lr_scheduler_type="cosine",
    report_to="none",
    load_best_model_at_end=True,
)

print(f"  Batch: {BATCH_SIZE}, Effective: {BATCH_SIZE*GRADIENT_ACCUMULATION}")

data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False, pad_to_multiple_of=8)  # Wyrównanie do wielokrotności 8 dla Tensor Cores

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
)

print("\n"+"="*80)
print("START TRENINGU")
print("="*80)

import time
time.sleep(3)

try:
    trainer.train()
    print("\n"+"="*80)
    print("✓ TRENING ZAKOŃCZONY")
    print("="*80)
except Exception as e:
    print(f"\n✗ BŁĄD: {e}")
    raise

print(f"\nZapisywanie do: {OUTPUT_DIR}")
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"✓ Model zapisany")
EOFPYTHON